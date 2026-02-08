import { IconPlayerPlay } from "@tabler/icons-react";
import { useMutation } from "convex/react";
import { useQuery } from "convex-helpers/react/cache";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { withToast } from "@/lib/utils";

const userId = import.meta.env.VITE_USER_ID as Id<"users">;

export function QuickStart() {
	const recentProjects = useQuery(api.time_entries.getRecentProjects, {
		userId,
		limit: 5,
	});
	const createMutation = useMutation(api.time_entries.create);

	const handleQuickStart = (
		project: NonNullable<typeof recentProjects>[number],
	) => {
		const wrappedMutation = withToast(
			createMutation,
			"Starting timer...",
			"Timer started",
			"Failed to start timer",
		);
		wrappedMutation({
			userId,
			name: project.lastEntryName,
			projectId: project.projectId,
			clientId: project.clientId,
			categoryId: project.categoryId,
		});
	};

	const handleGenericStart = () => {
		const wrappedMutation = withToast(
			createMutation,
			"Starting timer...",
			"Timer started",
			"Failed to start timer",
		);
		wrappedMutation({ userId, name: "New Time Entry" });
	};

	if (recentProjects === undefined) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Quick Start</CardTitle>
					<CardDescription>Loading recent projects...</CardDescription>
				</CardHeader>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">Quick Start</CardTitle>
				<CardDescription>Start a timer from recent projects</CardDescription>
			</CardHeader>
			<CardContent>
				{recentProjects.length === 0 ? (
					<div className="flex items-center gap-3">
						<span className="text-sm text-muted-foreground">
							No recent projects
						</span>
						<Button onClick={handleGenericStart} variant="outline" size="sm">
							<IconPlayerPlay className="mr-1 size-4" />
							Start Timer
						</Button>
					</div>
				) : (
					<div className="flex flex-wrap gap-2">
						{recentProjects.map((project) => (
							<Button
								key={project.projectId}
								variant="outline"
								size="sm"
								onClick={() => handleQuickStart(project)}
								className="h-auto gap-1.5 py-1.5"
							>
								<IconPlayerPlay className="size-3.5" />
								<span>{project.projectName}</span>
								{project.clientName && (
									<Badge variant="secondary" className="text-xs">
										{project.clientName}
									</Badge>
								)}
							</Button>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
