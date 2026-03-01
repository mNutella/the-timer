import { useAuthActions } from "@convex-dev/auth/react";
import { onOpenUrl, getCurrent } from "@tauri-apps/plugin-deep-link";
import { useEffect } from "react";

const PENDING_CODE_KEY = "__pendingOAuthCode";
// Track last processed code to avoid replaying stale URLs from getCurrent().
// Tauri's getCurrent() never clears its buffer — it returns the same URL on
// every call until a new deep link overwrites it. This key lets us safely call
// getCurrent() from multiple paths (cold start, focus fallback) without
// reprocessing an already-consumed code.
const LAST_CODE_KEY = "__lastOAuthCode";

/**
 * Handles OAuth deep-link callbacks (universaltimer://callback?code=...).
 *
 * Flow:
 * 1. Deep link arrives → store code in sessionStorage → reload page
 * 2. On reload → hook finds pending code → calls signIn("google", { code })
 * 3. signIn reads the verifier from the library's own namespaced storage
 * 4. Server verifies code + verifier → returns tokens → authenticated
 *
 * We do NOT inject code into the URL because the auth provider's built-in
 * handler can fire twice, and the second call wipes tokens from the first.
 */
export function useDeepLinkAuth() {
	const { signIn } = useAuthActions();

	useEffect(() => {
		// After reload: process the pending OAuth code
		const pendingCode = sessionStorage.getItem(PENDING_CODE_KEY);
		if (pendingCode) {
			sessionStorage.removeItem(PENDING_CODE_KEY);
			void signIn("google", { code: pendingCode });
			return;
		}

		let cleaned = false;
		let unlisten: (() => void) | undefined;

		const processUrls = (urls: string[]) => {
			const lastCode = sessionStorage.getItem(LAST_CODE_KEY);
			for (const urlString of urls) {
				try {
					const url = new URL(urlString);
					const code = url.searchParams.get("code");
					if (code && code !== lastCode) {
						sessionStorage.setItem(LAST_CODE_KEY, code);
						sessionStorage.setItem(PENDING_CODE_KEY, code);
						window.location.reload();
						return;
					}
				} catch {
					// Ignore unparseable URLs
				}
			}
		};

		const checkCurrent = () => {
			getCurrent()
				.then((urls) => {
					if (urls) processUrls(urls);
				})
				.catch(() => {});
		};

		// Cold-start: app was launched by the deep link
		checkCurrent();

		// Warm: app is already running when deep link fires
		onOpenUrl(processUrls)
			.then((fn) => {
				if (cleaned) {
					fn();
					return;
				}
				unlisten = fn;
			})
			.catch(() => {});

		// Fallback: when app gains focus after a deep link activation, the
		// onOpenUrl event may not fire reliably (e.g. after webview reload or
		// effect re-runs from auth state changes). Polling getCurrent() on
		// focus is safe because LAST_CODE_KEY deduplicates stale URLs.
		const onFocus = () => {
			checkCurrent();
		};
		window.addEventListener("focus", onFocus);

		return () => {
			cleaned = true;
			unlisten?.();
			window.removeEventListener("focus", onFocus);
		};
	}, [signIn]);
}
