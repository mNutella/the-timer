import { useQuery } from "convex-helpers/react/cache";
import { useEffect, useRef } from "react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { useSettings } from "@/lib/settings";

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
	const { settings } = useSettings();
	const enabled = isTauri && settings.enableIsland;

	const runningTimer = useQuery(
		api.time_entries.getRunningTimer,
		enabled ? { userId } : "skip",
	);
	const recentProjects = useQuery(
		api.time_entries.getRecentProjects,
		enabled ? { userId, limit: 4 } : "skip",
	);

	// Keep refs for the handshake callback (avoids stale closures)
	const runningTimerRef = useRef(runningTimer);
	const recentProjectsRef = useRef(recentProjects);
	runningTimerRef.current = runningTimer;
	recentProjectsRef.current = recentProjects;

	// Show or hide island when setting changes at runtime.
	// We use show/hide instead of create/destroy because closing the NSPanel
	// leaves a stale entry in tauri_nspanel's registry, causing create_island
	// to bail with "already exists" on re-toggle.
	useEffect(() => {
		if (!isTauri) return;
		import("@tauri-apps/api/core").then(({ invoke }) => {
			if (settings.enableIsland) {
				// create_island is idempotent (skips if panel exists), then show it
				invoke("create_island")
					.then(() => invoke("show_island"))
					.catch(console.error);
			} else {
				invoke("hide_island").catch(console.error);
			}
		});
	}, [settings.enableIsland]);

	// Emit on data changes
	useEffect(() => {
		if (!enabled || runningTimer === undefined) return;
		import("@tauri-apps/api/event").then(({ emit }) => {
			emit("island-running-timer", runningTimer);
		});
	}, [enabled, runningTimer]);

	useEffect(() => {
		if (!enabled || recentProjects === undefined) return;
		import("@tauri-apps/api/event").then(({ emit }) => {
			emit("island-recent-projects", recentProjects);
		});
	}, [enabled, recentProjects]);

	// Respond to island handshake (handles race condition during HMR / startup)
	useEffect(() => {
		if (!enabled) return;
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
	}, [enabled]);
}
