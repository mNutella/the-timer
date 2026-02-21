import { useMutation } from "convex/react";
import { Circle, Play, Square } from "lucide-react";
import { useEffect, useMemo } from "react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { getEndOfDay, getStartOfDay } from "@/../convex/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { useLiveElapsedTime } from "@/hooks/use-live-elapsed-time";
import { useStablePaginatedQuery } from "@/hooks/useStablePaginatedQuery";
import type { TimeEntry } from "@/lib/types";
import { formatDuration, formatTimeForInput, withToast } from "@/lib/utils";

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
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Today's Activity</CardTitle>
					<CardDescription>Loading...</CardDescription>
				</CardHeader>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">Today's Activity</CardTitle>
				<CardDescription>
					{entries.length} {entries.length === 1 ? "entry" : "entries"} today
				</CardDescription>
			</CardHeader>
			<CardContent>
				{entries.length === 0 ? (
					<p className="text-sm text-muted-foreground">
						No time entries today. Start a timer to get going!
					</p>
				) : (
					<div className="flex flex-col gap-1">
						{entries.map((entry) => (
							<ActivityRow key={entry._id} entry={entry} />
						))}
					</div>
				)}
			</CardContent>
		</Card>
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
		<div className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted/50">
			<span className="min-w-0 flex-1 truncate text-sm">{entry.name}</span>
			<div className="flex shrink-0 items-center gap-1.5">
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
			<div className="flex shrink-0 items-center gap-2">
				{isRunning ? (
					<Badge className="animate-pulse gap-1 tabular-nums">
						<Circle className="size-3" />
						{elapsed}
					</Badge>
				) : (
					<span className="text-xs tabular-nums text-muted-foreground">
						{formatDuration(entry.duration ?? 0)}
					</span>
				)}
				<span className="text-xs tabular-nums text-muted-foreground">
					{entry.start_time
						? formatTimeForInput(new Date(entry.start_time))
						: ""}
					{entry.end_time
						? ` - ${formatTimeForInput(new Date(entry.end_time))}`
						: ""}
				</span>
				{isRunning ? (
					<Button
						onClick={handleStop}
						variant="ghost"
						size="icon"
						className="size-7"
					>
						<Square className="size-3.5" />
					</Button>
				) : (
					<Button
						onClick={handleResume}
						variant="ghost"
						size="icon"
						className="size-7"
					>
						<Play className="size-3.5" />
					</Button>
				)}
			</div>
		</div>
	);
}
