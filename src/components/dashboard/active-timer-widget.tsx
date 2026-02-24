import { useMutation } from "convex/react";
import { useQuery } from "convex-helpers/react/cache";
import { Play, Square, Timer } from "lucide-react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLiveElapsedTime } from "@/hooks/use-live-elapsed-time";
import { cn } from "@/lib/utils";
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
			<div className="rounded-xl border border-border bg-card p-5">
				<div className="flex items-center gap-3">
					<div className="flex size-10 items-center justify-center rounded-lg bg-muted">
						<Timer className="size-5 text-muted-foreground" />
					</div>
					<div>
						<p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
							Active Timer
						</p>
						<p className="text-2xl font-semibold tabular-nums">--:--:--</p>
					</div>
				</div>
			</div>
		);
	}

	if (!isRunning) {
		return (
			<div className="rounded-xl border border-border bg-card p-5">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="flex size-10 items-center justify-center rounded-lg bg-muted">
							<Timer className="size-5 text-muted-foreground" />
						</div>
						<div>
							<p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
								Active Timer
							</p>
							<p className="text-lg text-muted-foreground">
								No active timer
							</p>
						</div>
					</div>
					<Button onClick={handleStart} size="sm">
						<Play className="mr-1 size-4" />
						Start Timer
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div
			className={cn(
				"rounded-xl border border-emerald-500/30 bg-card p-5",
				"card-accent-green",
				"shadow-[0_0_24px_-6px_oklch(0.72_0.17_160_/_0.15)]",
			)}
		>
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<div className="relative flex size-10 items-center justify-center rounded-lg bg-emerald-500/10">
						<Timer className="size-5 text-emerald-400" />
						<span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-400 motion-safe:animate-pulse" />
					</div>
					<div>
						<p className="text-xs font-medium uppercase tracking-wider text-emerald-400">
							Recording
						</p>
						<p className="text-3xl font-semibold tabular-nums tracking-tight">
							{elapsed}
						</p>
						<div className="mt-1 flex items-center gap-2">
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
				</div>
				<Button onClick={handleStop} variant="destructive" size="sm">
					<Square className="mr-1 size-4" />
					Stop
				</Button>
			</div>
		</div>
	);
}
