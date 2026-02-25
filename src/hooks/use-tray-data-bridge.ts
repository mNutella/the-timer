import { useMutation } from "convex/react";
import { useQuery } from "convex-helpers/react/cache";
import { useEffect, useRef } from "react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { optimisticCreateTimer, optimisticStopTimer } from "@/lib/optimistic-updates";
import { useSettings } from "@/lib/settings";
const isTauri =
	typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

/**
 * Bridges Convex query data to the system tray via Tauri events.
 * Subscribes to getRunningTimer and getRecentProjects, then emits
 * `tray-timer-state` and `tray-recent-entries` events for the Rust
 * tray module to consume.
 *
 * Also listens for tray menu actions (toggle timer, start recent,
 * show window) and routes them to Convex mutations.
 */
export function useTrayDataBridge() {
	const { settings } = useSettings();

	const runningTimer = useQuery(
		api.time_entries.getRunningTimer,
		isTauri ? {} : "skip",
	);
	const recentProjects = useQuery(
		api.time_entries.getRecentProjects,
		isTauri ? { limit: 5 } : "skip",
	);

	const stopMutation = useMutation(api.time_entries.stop).withOptimisticUpdate(optimisticStopTimer);
	const createMutation = useMutation(api.time_entries.create).withOptimisticUpdate(optimisticCreateTimer);

	// Keep refs for event callbacks
	const runningTimerRef = useRef(runningTimer);
	const recentProjectsRef = useRef(recentProjects);
	runningTimerRef.current = runningTimer;
	recentProjectsRef.current = recentProjects;

	// Emit timer state to Rust tray on changes.
	// showTitle controls menu bar elapsed display; the menu itself always
	// reflects the real timer state so start/stop/recent actions keep working.
	useEffect(() => {
		if (!isTauri || runningTimer === undefined) return;
		import("@tauri-apps/api/event").then(({ emit }) => {
			const payload = runningTimer
				? {
						running: true,
						startTime: runningTimer.start_time,
						entryId: runningTimer._id,
						name: runningTimer.name || "",
						projectName: runningTimer.project?.name || "",
						clientName: runningTimer.client?.name || "",
						showTitle: settings.enableTrayTimer,
					}
				: {
						running: false,
						startTime: null,
						entryId: null,
						name: null,
						projectName: null,
						clientName: null,
						showTitle: settings.enableTrayTimer,
					};
			emit("tray-timer-state", payload);
		});
	}, [runningTimer, settings.enableTrayTimer]);

	// Emit recent entries to Rust tray on changes
	useEffect(() => {
		if (!isTauri || recentProjects === undefined) return;
		import("@tauri-apps/api/event").then(({ emit }) => {
			emit("tray-recent-entries", recentProjects);
		});
	}, [recentProjects]);

	// Use refs for mutation functions so the listener effect has no deps
	// and only runs once (immune to StrictMode double-mount race).
	const stopRef = useRef(stopMutation);
	const createRef = useRef(createMutation);
	stopRef.current = stopMutation;
	createRef.current = createMutation;

	// Listen for tray events from Rust
	useEffect(() => {
		if (!isTauri) return;
		let cleaned = false;
		const unlisteners: (() => void)[] = [];

		function addListener(fn: () => void) {
			if (cleaned) fn();
			else unlisteners.push(fn);
		}

		import("@tauri-apps/api/event").then(({ listen }) => {
			if (cleaned) return;

			listen("tray-toggle-timer", async () => {
				const timer = runningTimerRef.current;
				if (timer) {
					await stopRef.current({ id: timer._id });
				} else {
					await createRef.current({ name: "New Time Entry" });
				}
			}).then(addListener);

			listen<number>("tray-start-recent", async (event) => {
				const recents = recentProjectsRef.current;
				if (!recents || event.payload >= recents.length) return;
				const entry = recents[event.payload];

				const timer = runningTimerRef.current;
				if (timer) {
					await stopRef.current({ id: timer._id });
				}

				await createRef.current({
					name: entry.lastEntryName || "",
					projectId: entry.projectId as Id<"projects"> | undefined,
					clientId: entry.clientId
						? (entry.clientId as Id<"clients">)
						: undefined,
				});
			}).then(addListener);
		});

		return () => {
			cleaned = true;
			for (const unlisten of unlisteners) {
				unlisten();
			}
		};
	}, []);
}
