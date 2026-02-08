import { IconPlayerPlay, IconPlayerStop } from "@tabler/icons-react";
import { useMutation } from "convex/react";
import { useQuery } from "convex-helpers/react/cache";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { useLiveElapsedTime } from "@/hooks/use-live-elapsed-time";
import { withToast } from "@/lib/utils";

const userId = import.meta.env.VITE_USER_ID as Id<"users">;

export function ActiveTimerWidget() {
	const runningTimer = useQuery(api.time_entries.getRunningTimer, { userId });
	const createMutation = useMutation(api.time_entries.create);
	const stopMutation = useMutation(api.time_entries.stop);

	const isRunning = !!runningTimer;
	const elapsed = useLiveElapsedTime(runningTimer?.start_time ?? 0, isRunning);

	const handleStop = () => {
		if (!runningTimer) return;
		const wrappedMutation = withToast(
			stopMutation,
			"Stopping timer...",
			"Timer stopped",
			"Failed to stop timer",
		);
		wrappedMutation({ id: runningTimer._id, userId });
	};

	const handleStart = () => {
		const wrappedMutation = withToast(
			createMutation,
			"Starting timer...",
			"Timer started",
			"Failed to start timer",
		);
		wrappedMutation({ userId, name: "New Time Entry" });
	};

	if (runningTimer === undefined) {
		return (
			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<div>
						<CardDescription>Active Timer</CardDescription>
						<CardTitle className="text-2xl font-semibold tabular-nums">
							--:--:--
						</CardTitle>
					</div>
				</CardHeader>
			</Card>
		);
	}

	if (!isRunning) {
		return (
			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<div>
						<CardDescription>Active Timer</CardDescription>
						<CardTitle className="text-lg text-muted-foreground">
							No active timer
						</CardTitle>
					</div>
					<Button onClick={handleStart} size="sm">
						<IconPlayerPlay className="mr-1 size-4" />
						Start Timer
					</Button>
				</CardHeader>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between">
				<div className="flex flex-col gap-1">
					<CardDescription>Active Timer</CardDescription>
					<CardTitle className="text-3xl font-semibold tabular-nums">
						{elapsed}
					</CardTitle>
					<div className="flex items-center gap-2">
						<span className="text-sm text-muted-foreground">
							{runningTimer.name}
						</span>
						{runningTimer.client && (
							<Badge variant="outline">{runningTimer.client.name}</Badge>
						)}
						{runningTimer.project && (
							<Badge variant="secondary">{runningTimer.project.name}</Badge>
						)}
						{runningTimer.category && (
							<Badge>{runningTimer.category.name}</Badge>
						)}
					</div>
				</div>
				<Button onClick={handleStop} variant="destructive" size="sm">
					<IconPlayerStop className="mr-1 size-4" />
					Stop
				</Button>
			</CardHeader>
		</Card>
	);
}
