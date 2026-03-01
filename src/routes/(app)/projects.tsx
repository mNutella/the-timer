import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex-helpers/react/cache";
import { useMutation } from "convex/react";
import { FolderKanban } from "lucide-react";
import { useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";
import { toast } from "sonner";

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
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { optimisticDeleteProject, optimisticUpdateProject } from "@/lib/optimistic-updates";
import { withToast } from "@/lib/utils";

export const Route = createFileRoute("/(app)/projects")({
	component: ProjectsPage,
});

const STATUS_OPTIONS = ["active", "archived", "completed"] as const;
type ProjectStatus = (typeof STATUS_OPTIONS)[number];

const statusVariant: Record<ProjectStatus, "default" | "secondary" | "outline"> = {
	active: "default",
	archived: "secondary",
	completed: "outline",
};

function ProjectRateCell({
	projectId,
	currentRate,
	clientRate,
}: {
	projectId: Id<"projects">;
	currentRate?: number;
	clientRate?: number;
}) {
	const updateProject = useMutation(api.projects.update);
	const [editing, setEditing] = useState(false);
	const [value, setValue] = useState(currentRate ? (currentRate / 100).toString() : "");

	const effectiveRate = currentRate ?? clientRate;

	if (editing) {
		return (
			<Input
				autoFocus
				type="number"
				min="0"
				step="0.01"
				placeholder={clientRate ? (clientRate / 100).toFixed(2) : "0.00"}
				value={value}
				onChange={(e) => setValue(e.target.value)}
				onBlur={() => {
					setEditing(false);
					const parsed = Number.parseFloat(value);
					if (value === "" || value === "0") {
						updateProject({ id: projectId, clearHourlyRate: true }).catch(() =>
							toast.error("Failed to update rate"),
						);
						return;
					}
					if (Number.isNaN(parsed) || parsed < 0) return;
					updateProject({
						id: projectId,
						hourly_rate_cents: Math.round(parsed * 100),
					}).catch(() => toast.error("Failed to update rate"));
				}}
				onKeyDown={(e) => {
					if (e.key === "Enter") e.currentTarget.blur();
					if (e.key === "Escape") setEditing(false);
				}}
				className="h-7 w-24 text-right"
			/>
		);
	}

	return (
		<button
			type="button"
			onClick={() => {
				setValue(currentRate ? (currentRate / 100).toString() : "");
				setEditing(true);
			}}
			className="cursor-pointer text-sm text-muted-foreground hover:text-foreground hover:underline"
		>
			{effectiveRate ? (
				<span>
					${(effectiveRate / 100).toFixed(2)}/hr
					{!currentRate && clientRate && <span className="ml-1 text-xs opacity-60">(client)</span>}
				</span>
			) : (
				"—"
			)}
		</button>
	);
}

function ProjectsPage() {
	const [searchValue, setSearchValue] = useState("");
	const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
	const [clientFilter, setClientFilter] = useState<string>("all");

	const clients = useQuery(api.clients.list, {});
	const clientMap = useMemo(() => new Map(clients?.map((c) => [c._id, c]) ?? []), [clients]);
	const projects = useQuery(api.projects.list, {
		clientId: clientFilter !== "all" ? (clientFilter as Id<"clients">) : undefined,
		dateRange:
			dateRange?.from && dateRange?.to
				? {
						startDate: dateRange.from.getTime(),
						endDate: dateRange.to.getTime(),
					}
				: undefined,
	});
	const createProject = useMutation(api.projects.create);
	const updateProject = useMutation(api.projects.update).withOptimisticUpdate(
		optimisticUpdateProject,
	);
	const deleteProject = useMutation(api.projects.deleteOne).withOptimisticUpdate(
		optimisticDeleteProject,
	);

	const handleStatusChange = (id: Id<"projects">, status: ProjectStatus) => {
		updateProject({ id, status }).catch(() => toast.error("Failed to update status"));
	};

	const handleClientChange = (id: Id<"projects">, value: string) => {
		if (value === "none") {
			updateProject({ id, clearClientId: true }).catch(() =>
				toast.error("Failed to update client"),
			);
		} else {
			updateProject({ id, clientId: value as Id<"clients"> }).catch(() =>
				toast.error("Failed to update client"),
			);
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
								<button type="button" className="cursor-pointer text-sm hover:underline">
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
											onClick={() => handleClientChange(project._id as Id<"projects">, "none")}
										>
											<span className="text-muted-foreground">Remove client</span>
										</DropdownMenuItem>
										<DropdownMenuSeparator />
									</>
								)}
								{clients?.map((client) => (
									<DropdownMenuItem
										key={client._id}
										onClick={() => handleClientChange(project._id as Id<"projects">, client._id)}
									>
										{client.name}
										{client._id === project.clientId && (
											<span className="ml-auto text-xs text-muted-foreground">current</span>
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
									<Badge variant={statusVariant[project.status]}>{project.status}</Badge>
								</button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="start">
								{STATUS_OPTIONS.map((status) => (
									<DropdownMenuItem
										key={status}
										onClick={() => handleStatusChange(project._id as Id<"projects">, status)}
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
				{
					header: "Rate",
					className: "w-36",
					render: (project) => {
						const clientObj = project.clientId ? (clientMap.get(project.clientId) ?? null) : null;
						return (
							<ProjectRateCell
								projectId={project._id as Id<"projects">}
								currentRate={project.hourly_rate_cents}
								clientRate={clientObj?.hourly_rate_cents}
							/>
						);
					},
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
				updateProject({ id: id as Id<"projects">, name }).catch(() =>
					toast.error("Failed to update project"),
				)
			}
			onDelete={(id) =>
				deleteProject({ id: id as Id<"projects"> }).catch(() =>
					toast.error("Failed to delete project"),
				)
			}
		/>
	);
}
