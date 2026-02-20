import { IconPencil, IconPlus, IconTrash } from "@tabler/icons-react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { useQuery } from "convex-helpers/react/cache";
import { useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import {
	TimeRangeFilter,
	TimerEntrySearch,
} from "@/components/time-entry-filters";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { formatDuration, withToast } from "@/lib/utils";

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
	const userId = import.meta.env.VITE_USER_ID as Id<"users">;
	const [searchValue, setSearchValue] = useState("");
	const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
	const [clientFilter, setClientFilter] = useState<string>("all");

	const clients = useQuery(api.clients.list, { userId });
	const projects = useQuery(api.projects.list, {
		userId,
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
	const updateProject = useMutation(api.projects.update);
	const deleteProject = useMutation(api.projects.deleteOne);

	const [editingId, setEditingId] = useState<Id<"projects"> | null>(null);
	const [editValue, setEditValue] = useState("");
	const [newName, setNewName] = useState("");
	const [isAdding, setIsAdding] = useState(false);
	const [deleteTarget, setDeleteTarget] = useState<{
		id: Id<"projects">;
		name: string;
	} | null>(null);

	const filteredProjects = useMemo(() => {
		if (!projects) return undefined;
		if (!searchValue.trim()) return projects;
		const query = searchValue.toLowerCase();
		return projects.filter((p) => p.name.toLowerCase().includes(query));
	}, [projects, searchValue]);

	const handleCreate = () => {
		if (!newName.trim()) return;
		withToast(
			createProject,
			"Creating project...",
			"Project created",
			"Failed to create project",
		)({ name: newName.trim(), userId });
		setNewName("");
		setIsAdding(false);
	};

	const handleStartEdit = (id: Id<"projects">, name: string) => {
		setEditingId(id);
		setEditValue(name);
	};

	const handleSaveEdit = () => {
		if (!editingId || !editValue.trim()) return;
		withToast(
			updateProject,
			"Updating project...",
			"Project updated",
			"Failed to update project",
		)({ id: editingId, userId, name: editValue.trim() });
		setEditingId(null);
		setEditValue("");
	};

	const handleStatusChange = (id: Id<"projects">, status: ProjectStatus) => {
		withToast(
			updateProject,
			"Updating status...",
			"Status updated",
			"Failed to update status",
		)({ id, userId, status });
	};

	const handleClientChange = (id: Id<"projects">, value: string) => {
		if (value === "none") {
			withToast(
				updateProject,
				"Updating client...",
				"Client updated",
				"Failed to update client",
			)({ id, userId, clearClientId: true });
		} else {
			withToast(
				updateProject,
				"Updating client...",
				"Client updated",
				"Failed to update client",
			)({ id, userId, clientId: value as Id<"clients"> });
		}
	};

	const handleDelete = () => {
		if (!deleteTarget) return;
		withToast(
			deleteProject,
			"Deleting project...",
			"Project deleted",
			"Failed to delete project",
		)({ id: deleteTarget.id, userId });
		setDeleteTarget(null);
	};

	return (
		<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
			<div className="px-4 lg:px-6">
				<div className="flex items-center justify-between mb-4">
					<div className="flex items-center gap-2">
						<TimerEntrySearch value={searchValue} onChange={setSearchValue} />
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
						<TimeRangeFilter value={dateRange} onChange={setDateRange} />
					</div>
					{isAdding ? (
						<div className="flex items-center gap-2">
							<Input
								autoFocus
								placeholder="Project name"
								value={newName}
								onChange={(e) => setNewName(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") handleCreate();
									if (e.key === "Escape") {
										setIsAdding(false);
										setNewName("");
									}
								}}
								className="h-8 w-48"
							/>
							<Button size="sm" variant="default" onClick={handleCreate}>
								Add
							</Button>
							<Button
								size="sm"
								variant="ghost"
								onClick={() => {
									setIsAdding(false);
									setNewName("");
								}}
							>
								Cancel
							</Button>
						</div>
					) : (
						<Button
							size="sm"
							variant="outline"
							onClick={() => setIsAdding(true)}
						>
							<IconPlus className="size-4" />
							Add Project
						</Button>
					)}
				</div>

				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Name</TableHead>
							<TableHead className="w-40">Client</TableHead>
							<TableHead className="w-32">Status</TableHead>
							<TableHead className="w-36">Total Hours</TableHead>
							<TableHead className="w-24 text-right">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{filteredProjects?.length === 0 && (
							<TableRow>
								<TableCell
									colSpan={5}
									className="text-center text-muted-foreground py-8"
								>
									{projects?.length === 0
										? "No projects yet. Add one to get started."
										: "No projects match your search."}
								</TableCell>
							</TableRow>
						)}
						{filteredProjects?.map((project) => (
							<TableRow key={project._id}>
								<TableCell>
									{editingId === project._id ? (
										<Input
											autoFocus
											value={editValue}
											onChange={(e) => setEditValue(e.target.value)}
											onKeyDown={(e) => {
												if (e.key === "Enter") handleSaveEdit();
												if (e.key === "Escape") {
													setEditingId(null);
													setEditValue("");
												}
											}}
											onBlur={handleSaveEdit}
											className="h-7 w-48"
										/>
									) : (
										<span className="font-medium">{project.name}</span>
									)}
								</TableCell>
								<TableCell>
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
															handleClientChange(project._id, "none")
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
														handleClientChange(project._id, client._id)
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
								</TableCell>
								<TableCell>
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
														handleStatusChange(project._id, status)
													}
												>
													<Badge
														variant={statusVariant[status]}
														className="mr-2"
													>
														{status}
													</Badge>
												</DropdownMenuItem>
											))}
										</DropdownMenuContent>
									</DropdownMenu>
								</TableCell>
								<TableCell className="text-muted-foreground tabular-nums">
									{formatDuration(project.totalDuration)}
								</TableCell>
								<TableCell className="text-right">
									<div className="flex items-center justify-end gap-1">
										<Button
											size="icon"
											variant="ghost"
											className="size-7"
											onClick={() => handleStartEdit(project._id, project.name)}
										>
											<IconPencil className="size-3.5" />
										</Button>
										<Button
											size="icon"
											variant="ghost"
											className="size-7 text-destructive hover:text-destructive"
											onClick={() =>
												setDeleteTarget({
													id: project._id,
													name: project.name,
												})
											}
										>
											<IconTrash className="size-3.5" />
										</Button>
									</div>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>

			<AlertDialog
				open={!!deleteTarget}
				onOpenChange={(open) => !open && setDeleteTarget(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete project</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete "{deleteTarget?.name}"? Time
							entries linked to this project will lose their project reference.
							This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDelete}
							className="bg-destructive text-white hover:bg-destructive/90"
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
