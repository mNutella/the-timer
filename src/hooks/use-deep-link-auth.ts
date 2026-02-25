import { useEffect } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { onOpenUrl, getCurrent } from "@tauri-apps/plugin-deep-link";

const PENDING_CODE_KEY = "__pendingOAuthCode";

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

    // Listen for deep link URLs
    let unlisten: (() => void) | undefined;
    let handled = false;

    const handleUrls = (urls: string[]) => {
      if (handled) return;

      for (const urlString of urls) {
        try {
          const url = new URL(urlString);
          const code = url.searchParams.get("code");
          if (code) {
            handled = true;
            // Store code and reload — signIn runs on next mount
            sessionStorage.setItem(PENDING_CODE_KEY, code);
            window.location.reload();
            return;
          }
        } catch {
          // Ignore unparseable URLs
        }
      }
    };

    // Cold-start: app was launched by the deep link
    getCurrent()
      .then((urls) => { if (urls) handleUrls(urls); })
      .catch(() => {});

    // Warm: app is already running when deep link fires
    onOpenUrl(handleUrls)
      .then((fn) => { unlisten = fn; })
      .catch(() => {});

    return () => {
      unlisten?.();
    };
  }, [signIn]);
}
