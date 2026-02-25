import { useMutation } from "convex/react";
import { useQuery } from "convex-helpers/react/cache";
import { Play, Square, Timer } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/../convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLiveElapsedTime } from "@/hooks/use-live-elapsed-time";
import { optimisticCreateTimer, optimisticStopTimer } from "@/lib/optimistic-updates";
import { cn } from "@/lib/utils";

export function ActiveTimerWidget() {
	const runningTimer = useQuery(api.time_entries.getRunningTimer, {});
	const createMutation = useMutation(api.time_entries.create).withOptimisticUpdate(optimisticCreateTimer);
	const stopMutation = useMutation(api.time_entries.stop).withOptimisticUpdate(optimisticStopTimer);

	const isRunning = !!runningTimer;
	const elapsed = useLiveElapsedTime(runningTimer?.start_time ?? 0, isRunning);

	const handleStop = () => {
		if (!runningTimer) return;
		stopMutation({ id: runningTimer._id })
			.catch(() => toast.error("Failed to stop timer"));
	};

	const handleStart = () => {
		createMutation({ name: "New Time Entry" })
			.catch(() => toast.error("Failed to start timer"));
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
				"rounded-xl border border-success/30 bg-card p-5",
				"card-accent-green",
				"shadow-[var(--glow-success)]",
			)}
		>
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<div className="relative flex size-10 items-center justify-center rounded-lg bg-success/10">
						<Timer className="size-5 text-success" />
						<span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-success motion-safe:animate-pulse" />
					</div>
					<div>
						<p className="text-xs font-medium uppercase tracking-wider text-success">
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
