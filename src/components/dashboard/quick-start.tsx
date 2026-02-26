import { useState } from "react";
import { useMutation } from "convex/react";
import { useQuery } from "convex-helpers/react/cache";
import { Play, Zap } from "lucide-react";
import { api } from "@/../convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StartTimerDialog } from "@/components/start-timer-dialog";
import { optimisticCreateTimer } from "@/lib/optimistic-updates";
import { toast } from "sonner";

export function QuickStart() {
	const [dialogOpen, setDialogOpen] = useState(false);
	const recentProjects = useQuery(api.time_entries.getRecentProjects, {
		limit: 5,
	});
	const createMutation = useMutation(api.time_entries.create).withOptimisticUpdate(optimisticCreateTimer);

	const handleQuickStart = (
		project: NonNullable<typeof recentProjects>[number],
	) => {
		createMutation({
			name: project.lastEntryName,
			projectId: project.projectId,
			clientId: project.clientId,
			categoryId: project.categoryId,
		}).catch(() => toast.error("Failed to start timer"));
	};

	if (recentProjects === undefined) {
		return (
			<div className="rounded-xl border border-border bg-card p-5">
				<div className="flex items-center gap-2">
					<Zap className="size-4 text-muted-foreground" />
					<p className="text-sm font-medium">Quick Start</p>
				</div>
				<p className="mt-2 text-sm text-muted-foreground">
					Loading recent projects...
				</p>
			</div>
		);
	}

	return (
		<div className="rounded-xl border border-border bg-card p-5">
			<div className="flex items-center gap-2">
				<Zap className="size-4 text-muted-foreground" />
				<p className="text-sm font-medium">Quick Start</p>
			</div>
			<p className="mt-0.5 text-xs text-muted-foreground">Recent projects</p>
			<div className="mt-3">
				{recentProjects.length === 0 ? (
					<div className="flex flex-col gap-2">
						<span className="text-sm text-muted-foreground">
							No recent projects
						</span>
						<Button onClick={() => setDialogOpen(true)} variant="outline" size="sm">
							<Play className="mr-1 size-4" />
							Start Timer
						</Button>
					</div>
				) : (
					<div className="flex flex-col gap-1.5">
						{recentProjects.map((project) => (
							<Button
								key={project.projectId}
								variant="outline"
								size="sm"
								onClick={() => handleQuickStart(project)}
								className="h-auto w-full justify-start gap-1.5 py-2 hover:border-success/40 hover:bg-success/5"
							>
								<Play className="size-3 shrink-0 text-success" />
								<span className="truncate">{project.projectName}</span>
								{project.clientName && (
									<Badge variant="secondary" className="ml-auto shrink-0 text-xs">
										{project.clientName}
									</Badge>
								)}
							</Button>
						))}
					</div>
				)}
			</div>
			<StartTimerDialog open={dialogOpen} onOpenChange={setDialogOpen} />
		</div>
	);
}
