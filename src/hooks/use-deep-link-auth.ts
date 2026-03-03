import { useAuthActions } from "@convex-dev/auth/react";
import { useEffect, useRef } from "react";

import { log } from "@/lib/logger";

const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

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
 *
 * On web this hook is a no-op — OAuth redirects are handled natively by the browser.
 */
export function useDeepLinkAuth() {
	const { signIn } = useAuthActions();
	// Ref keeps signIn always-current without re-running the effect.
	// signIn is NOT referentially stable (@convex-dev/auth recreates it when
	// auth state changes), so using it directly in the dep array would tear
	// down and re-register deep link listeners on every auth state transition.
	const signInRef = useRef(signIn);
	signInRef.current = signIn;

	useEffect(() => {
		if (!isTauri) return;

		// After reload: process the pending OAuth code.
		// Do NOT return early — listeners must be set up for subsequent sign-ins
		// within the same app session (sign-out → sign-in again).
		const pendingCode = sessionStorage.getItem(PENDING_CODE_KEY);
		if (pendingCode) {
			sessionStorage.removeItem(PENDING_CODE_KEY);
			log.info("OAuth: processing pending code from deep link");
			void signInRef.current("google", { code: pendingCode });
		}

		let cleaned = false;
		let unlisten: (() => void) | undefined;
		let unlistenFocus: (() => void) | undefined;
		let pollTimer: ReturnType<typeof setInterval> | undefined;

		const processUrls = (urls: string[]) => {
			const lastCode = sessionStorage.getItem(LAST_CODE_KEY);
			for (const urlString of urls) {
				try {
					const url = new URL(urlString);
					const code = url.searchParams.get("code");
					if (code && code !== lastCode) {
						log.info("OAuth: deep link received, storing code and reloading");
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
			import("@tauri-apps/plugin-deep-link").then(({ getCurrent }) => {
				getCurrent()
					.then((urls) => {
						if (urls) processUrls(urls);
					})
					.catch(() => {});
			});
		};

		// Cold-start: app was launched by the deep link
		checkCurrent();

		// Warm: app is already running when deep link fires
		import("@tauri-apps/plugin-deep-link")
			.then(({ onOpenUrl }) => onOpenUrl(processUrls))
			.then((fn) => {
				if (cleaned) {
					fn();
					return;
				}
				unlisten = fn;
			})
			.catch(() => {});

		// Fallback 1: Tauri native window focus event.
		// The webview focus event does not fire reliably when the native macOS
		// window regains focus after a deep link activation.
		import("@tauri-apps/api/window").then(({ getCurrentWindow }) => {
			getCurrentWindow()
				.onFocusChanged(({ payload: focused }) => {
					if (focused) checkCurrent();
				})
				.then((fn) => {
					if (cleaned) {
						fn();
						return;
					}
					unlistenFocus = fn;
				});
		});

		// Fallback 2: webview focus + visibilitychange
		const onFocus = () => checkCurrent();
		const onVisible = () => {
			if (document.visibilityState === "visible") checkCurrent();
		};
		window.addEventListener("focus", onFocus);
		document.addEventListener("visibilitychange", onVisible);

		// Fallback 3: Poll getCurrent() every 2s. onOpenUrl and focus events
		// don't fire reliably on macOS after the system browser handles the
		// OAuth redirect back to universaltimer://. getCurrent() always has
		// the latest deep link URL and LAST_CODE_KEY prevents duplicates.
		pollTimer = setInterval(checkCurrent, 2000);

		return () => {
			cleaned = true;
			unlisten?.();
			unlistenFocus?.();
			clearInterval(pollTimer);
			window.removeEventListener("focus", onFocus);
			document.removeEventListener("visibilitychange", onVisible);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);
}
