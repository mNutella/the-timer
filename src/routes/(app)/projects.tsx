import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { useQuery } from "convex-helpers/react/cache";
import { FolderKanban } from "lucide-react";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { EntityManagementTable } from "@/components/entity-management-table";
import { Badge } from "@/components/ui/badge";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	optimisticDeleteProject,
	optimisticUpdateProject,
} from "@/lib/optimistic-updates";
import { withToast } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/(app)/projects")({
	component: ProjectsPage,
});

const STATUS_OPTIONS = ["active", "archived", "completed"] as const;
type ProjectStatus = (typeof STATUS_OPTIONS)[number];

const statusVariant: Record<
	ProjectStatus,
	"default" | "secondary" | "outline"
> = {
	active: "default",
	archived: "secondary",
	completed: "outline",
};

function ProjectsPage() {
	const [searchValue, setSearchValue] = useState("");
	const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
	const [clientFilter, setClientFilter] = useState<string>("all");

	const clients = useQuery(api.clients.list, {});
	const projects = useQuery(api.projects.list, {
		clientId:
			clientFilter !== "all" ? (clientFilter as Id<"clients">) : undefined,
		dateRange:
			dateRange?.from && dateRange?.to
				? {
						startDate: dateRange.from.getTime(),
						endDate: dateRange.to.getTime(),
					}
				: undefined,
	});
	const createProject = useMutation(api.projects.create);
	const updateProject = useMutation(api.projects.update).withOptimisticUpdate(optimisticUpdateProject);
	const deleteProject = useMutation(api.projects.deleteOne).withOptimisticUpdate(optimisticDeleteProject);

	const handleStatusChange = (id: Id<"projects">, status: ProjectStatus) => {
		updateProject({ id, status })
			.catch(() => toast.error("Failed to update status"));
	};

	const handleClientChange = (id: Id<"projects">, value: string) => {
		if (value === "none") {
			updateProject({ id, clearClientId: true })
				.catch(() => toast.error("Failed to update client"));
		} else {
			updateProject({ id, clientId: value as Id<"clients"> })
				.catch(() => toast.error("Failed to update client"));
		}
	};

	return (
		<EntityManagementTable
			icon={FolderKanban}
			entityLabel="projects"
			entityLabelSingular="project"
			data={projects}
			searchValue={searchValue}
			onSearchChange={setSearchValue}
			dateRange={dateRange}
			onDateRangeChange={setDateRange}
			extraFilters={
				<Select value={clientFilter} onValueChange={setClientFilter}>
					<SelectTrigger className="h-9 w-40">
						<SelectValue placeholder="All Clients" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Clients</SelectItem>
						{clients?.map((client) => (
							<SelectItem key={client._id} value={client._id}>
								{client.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			}
			extraColumns={[
				{
					header: "Client",
					className: "w-40",
					render: (project) => (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<button
									type="button"
									className="cursor-pointer text-sm hover:underline"
								>
									{project.clientName ? (
										<span>{project.clientName}</span>
									) : (
										<span className="text-muted-foreground">—</span>
									)}
								</button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="start">
								{project.clientId && (
									<>
										<DropdownMenuItem
											onClick={() =>
												handleClientChange(
													project._id as Id<"projects">,
													"none",
												)
											}
										>
											<span className="text-muted-foreground">
												Remove client
											</span>
										</DropdownMenuItem>
										<DropdownMenuSeparator />
									</>
								)}
								{clients?.map((client) => (
									<DropdownMenuItem
										key={client._id}
										onClick={() =>
											handleClientChange(
												project._id as Id<"projects">,
												client._id,
											)
										}
									>
										{client.name}
										{client._id === project.clientId && (
											<span className="ml-auto text-muted-foreground text-xs">
												current
											</span>
										)}
									</DropdownMenuItem>
								))}
							</DropdownMenuContent>
						</DropdownMenu>
					),
				},
				{
					header: "Status",
					className: "w-32",
					render: (project) => (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<button type="button" className="cursor-pointer">
									<Badge variant={statusVariant[project.status]}>
										{project.status}
									</Badge>
								</button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="start">
								{STATUS_OPTIONS.map((status) => (
									<DropdownMenuItem
										key={status}
										onClick={() =>
											handleStatusChange(project._id as Id<"projects">, status)
										}
									>
										<Badge variant={statusVariant[status]} className="mr-2">
											{status}
										</Badge>
									</DropdownMenuItem>
								))}
							</DropdownMenuContent>
						</DropdownMenu>
					),
				},
			]}
			deleteDescription={(name) =>
				`Are you sure you want to delete "${name}"? Time entries linked to this project will lose their project reference. This action cannot be undone.`
			}
			onCreate={(name) =>
				withToast(
					createProject,
					"Creating project...",
					"Project created",
					"Failed to create project",
				)({ name })
			}
			onUpdate={(id, name) =>
				updateProject({ id: id as Id<"projects">, name })
					.catch(() => toast.error("Failed to update project"))
			}
			onDelete={(id) =>
				deleteProject({ id: id as Id<"projects"> })
					.catch(() => toast.error("Failed to delete project"))
			}
		/>
	);
}
