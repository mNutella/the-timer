import { useQuery } from "convex-helpers/react/cache";
import { useEffect, useRef } from "react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";

const userId = import.meta.env.VITE_USER_ID as Id<"users">;
const isTauri =
	typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

/**
 * Bridges Convex query data to the island overlay via Tauri events.
 * Subscribes to getRunningTimer and getRecentProjects, then emits
 * events so the island doesn't need its own duplicate subscriptions.
 *
 * Uses a handshake: the island emits "island-ready" when its listeners
 * are set up, and the bridge responds with the current data.
 */
export function useIslandDataBridge() {
	const runningTimer = useQuery(
		api.time_entries.getRunningTimer,
		isTauri ? { userId } : "skip",
	);
	const recentProjects = useQuery(
		api.time_entries.getRecentProjects,
		isTauri ? { userId, limit: 4 } : "skip",
	);

	// Keep refs for the handshake callback (avoids stale closures)
	const runningTimerRef = useRef(runningTimer);
	const recentProjectsRef = useRef(recentProjects);
	runningTimerRef.current = runningTimer;
	recentProjectsRef.current = recentProjects;

	// Emit on data changes
	useEffect(() => {
		if (!isTauri || runningTimer === undefined) return;
		import("@tauri-apps/api/event").then(({ emit }) => {
			emit("island-running-timer", runningTimer);
		});
	}, [runningTimer]);

	useEffect(() => {
		if (!isTauri || recentProjects === undefined) return;
		import("@tauri-apps/api/event").then(({ emit }) => {
			emit("island-recent-projects", recentProjects);
		});
	}, [recentProjects]);

	// Respond to island handshake (handles race condition during HMR / startup)
	useEffect(() => {
		if (!isTauri) return;
		let unlisten: (() => void) | null = null;
		import("@tauri-apps/api/event").then(({ listen, emit }) => {
			listen("island-ready", () => {
				if (runningTimerRef.current !== undefined) {
					emit("island-running-timer", runningTimerRef.current);
				}
				if (recentProjectsRef.current !== undefined) {
					emit("island-recent-projects", recentProjectsRef.current);
				}
			}).then((fn) => {
				unlisten = fn;
			});
		});
		return () => {
			unlisten?.();
		};
	}, []);
}
