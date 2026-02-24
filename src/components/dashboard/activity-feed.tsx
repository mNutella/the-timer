import { useMutation } from "convex/react";
import { Circle, Clock, Play, Square } from "lucide-react";
import { useEffect, useMemo } from "react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { getEndOfDay, getStartOfDay } from "@/../convex/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLiveElapsedTime } from "@/hooks/use-live-elapsed-time";
import { useStablePaginatedQuery } from "@/hooks/useStablePaginatedQuery";
import type { TimeEntry } from "@/lib/types";
import { cn, formatDuration, formatTimeForInput, withToast } from "@/lib/utils";

const userId = import.meta.env.VITE_USER_ID as Id<"users">;

export function ActivityFeed({
	onEntryCountChange,
}: {
	onEntryCountChange?: (count: number) => void;
}) {
	// Stabilize "today" range so it doesn't change every render
	const todayRange = useMemo(() => {
		const now = Date.now();
		return { startDate: getStartOfDay(now), endDate: getEndOfDay(now) };
	}, []);

	const { results, isLoading } = useStablePaginatedQuery<TimeEntry>(
		api.time_entries.searchTimeEntries,
		{
			userId,
			filters: { dateRange: todayRange },
		},
		{ initialNumItems: 10 },
	);

	// Report entry count to parent for summary cards
	const count = results?.length ?? 0;
	useEffect(() => {
		if (onEntryCountChange && results) {
			onEntryCountChange(count);
		}
	}, [onEntryCountChange, results, count]);

	// Reverse to show most recent first (searchTimeEntries with startDate returns ascending)
	const entries = results ? [...results].reverse() : [];

	if (isLoading && entries.length === 0) {
		return (
			<div className="rounded-xl border border-border bg-card p-5">
				<div className="flex items-center gap-2">
					<Clock className="size-4 text-muted-foreground" />
					<p className="text-sm font-medium">Today's Activity</p>
				</div>
				<p className="mt-3 text-sm text-muted-foreground">Loading...</p>
			</div>
		);
	}

	return (
		<div className="rounded-xl border border-border bg-card">
			<div className="flex items-center justify-between p-5 pb-0">
				<div className="flex items-center gap-2">
					<Clock className="size-4 text-muted-foreground" />
					<p className="text-sm font-medium">Today's Activity</p>
				</div>
				<span className="text-xs tabular-nums text-muted-foreground">
					{entries.length} {entries.length === 1 ? "entry" : "entries"}
				</span>
			</div>
			<div className="p-3 pt-4">
				{entries.length === 0 ? (
					<p className="px-2 py-4 text-center text-sm text-muted-foreground">
						No time entries today. Start a timer to get going!
					</p>
				) : (
					<div className="flex flex-col">
						{entries.map((entry) => (
							<ActivityRow key={entry._id} entry={entry} />
						))}
					</div>
				)}
			</div>
		</div>
	);
}

function ActivityRow({ entry }: { entry: TimeEntry }) {
	const createMutation = useMutation(api.time_entries.create);
	const stopMutation = useMutation(api.time_entries.stop);

	const isRunning = entry.end_time === undefined;
	const elapsed = useLiveElapsedTime(entry.start_time ?? 0, isRunning);

	const handleResume = () => {
		const wrappedMutation = withToast(
			createMutation,
			"Resuming timer...",
			"Timer resumed",
			"Failed to resume timer",
		);
		wrappedMutation({
			userId: import.meta.env.VITE_USER_ID as Id<"users">,
			name: entry.name,
			timeEntryId: entry._id,
		});
	};

	const handleStop = () => {
		const wrappedMutation = withToast(
			stopMutation,
			"Stopping timer...",
			"Timer stopped",
			"Failed to stop timer",
		);
		wrappedMutation({
			id: entry._id,
			userId: import.meta.env.VITE_USER_ID as Id<"users">,
		});
	};

	return (
		<div
			className={cn(
				"group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-accent/50",
				isRunning && "bg-emerald-500/5",
			)}
		>
			{/* Left status indicator */}
			<div className="flex w-1 self-stretch rounded-full">
				{isRunning && <div className="w-full rounded-full bg-emerald-400" />}
			</div>

			{/* Entry name */}
			<span className="min-w-0 flex-1 truncate text-sm">{entry.name}</span>

			{/* Tags */}
			<div className="hidden shrink-0 items-center gap-1.5 sm:flex">
				{entry.client && (
					<Badge variant="outline" className="text-xs">
						{entry.client.name}
					</Badge>
				)}
				{entry.project && (
					<Badge variant="secondary" className="text-xs">
						{entry.project.name}
					</Badge>
				)}
			</div>

			{/* Duration & time */}
			<div className="flex shrink-0 items-center gap-2">
				{isRunning ? (
					<span className="flex items-center gap-1.5 text-sm font-medium tabular-nums text-emerald-400">
						<Circle className="size-2 fill-emerald-400 text-emerald-400 motion-safe:animate-pulse" />
						{elapsed}
					</span>
				) : (
					<span className="text-sm tabular-nums text-muted-foreground">
						{formatDuration(entry.duration ?? 0)}
					</span>
				)}
				<span className="hidden text-xs tabular-nums text-muted-foreground lg:inline">
					{entry.start_time
						? formatTimeForInput(new Date(entry.start_time))
						: ""}
					{entry.end_time
						? ` – ${formatTimeForInput(new Date(entry.end_time))}`
						: ""}
				</span>
				{isRunning ? (
					<Button
						onClick={handleStop}
						variant="ghost"
						size="icon"
						className="size-7 opacity-0 group-hover:opacity-100 transition-opacity"
					>
						<Square className="size-3.5" />
					</Button>
				) : (
					<Button
						onClick={handleResume}
						variant="ghost"
						size="icon"
						className="size-7 opacity-0 group-hover:opacity-100 transition-opacity"
					>
						<Play className="size-3.5" />
					</Button>
				)}
			</div>
		</div>
	);
}
