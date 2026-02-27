import { useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { useQuery } from "convex-helpers/react/cache";
import { Square } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/../convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EditTimerDialog } from "@/components/edit-timer-dialog";
import { useLiveElapsedTime } from "@/hooks/use-live-elapsed-time";
import { optimisticStopTimer } from "@/lib/optimistic-updates";
import { cn } from "@/lib/utils";

export function RunningTimerBar() {
	const [editOpen, setEditOpen] = useState(false);
	const { pathname } = useLocation();
	const runningTimer = useQuery(api.time_entries.getRunningTimer, {});
	const stopMutation = useMutation(api.time_entries.stop).withOptimisticUpdate(optimisticStopTimer);

	const isRunning = !!runningTimer;
	const elapsed = useLiveElapsedTime(runningTimer?.start_time ?? 0, isRunning);

	const handleStop = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (!runningTimer) return;
		stopMutation({ id: runningTimer._id })
			.catch(() => toast.error("Failed to stop timer"));
	};

	if (!runningTimer || pathname === "/") return null;

	const openEditDialog = () => setEditOpen(true);

	return (
		<>
			<div
				role="button"
				tabIndex={0}
				onClick={openEditDialog}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						openEditDialog();
					}
				}}
				className={cn(
					"mx-4 lg:mx-6 mt-2 flex shrink-0 items-center justify-between rounded-lg border border-success/30 bg-success/5 px-4 py-2.5",
					"cursor-pointer transition-colors hover:bg-success/10",
					"animate-in slide-in-from-top-2 fade-in duration-300",
				)}
			>
				<div className="flex items-center gap-3 min-w-0">
					<span className="relative flex size-2.5 shrink-0">
						<span className="absolute inline-flex size-full rounded-full bg-success opacity-75 motion-safe:animate-ping" />
						<span className="relative inline-flex size-2.5 rounded-full bg-success" />
					</span>
					<span className="text-lg font-semibold tabular-nums text-success">
						{elapsed}
					</span>
					<span className="truncate text-sm text-muted-foreground">
						{runningTimer.name}
					</span>
					<div className="hidden items-center gap-1.5 sm:flex">
						{runningTimer.client && (
							<Badge variant="outline" className="text-xs">{runningTimer.client.name}</Badge>
						)}
						{runningTimer.project && (
							<Badge variant="secondary" className="text-xs">{runningTimer.project.name}</Badge>
						)}
						{runningTimer.category && (
							<Badge className="text-xs">{runningTimer.category.name}</Badge>
						)}
					</div>
				</div>
				<Button
					onClick={handleStop}
					variant="destructive"
					size="sm"
					className="ml-3 shrink-0"
				>
					<Square className="mr-1 size-3.5" />
					Stop
				</Button>
			</div>
			<EditTimerDialog
				open={editOpen}
				onOpenChange={setEditOpen}
				timer={runningTimer}
			/>
		</>
	);
}
