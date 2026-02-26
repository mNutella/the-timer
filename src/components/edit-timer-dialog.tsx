import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableCombobox, type SelectableItem } from "@/components/searchable-combobox";
import {
	optimisticUpdateTimeEntry,
	optimisticUpdateTimeEntryClient,
	optimisticUpdateTimeEntryProject,
	optimisticUpdateTimeEntryCategory,
} from "@/lib/optimistic-updates";
import { useLiveElapsedTime } from "@/hooks/use-live-elapsed-time";
import { toast } from "sonner";

interface RunningTimer {
	_id: Id<"time_entries">;
	name: string;
	start_time?: number;
	clientId?: Id<"clients">;
	projectId?: Id<"projects">;
	categoryId?: Id<"categories">;
	client: { _id: Id<"clients">; name: string } | null;
	project: { _id: Id<"projects">; name: string } | null;
	category: { _id: Id<"categories">; name: string } | null;
}

interface EditTimerDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	timer: RunningTimer;
}

export function EditTimerDialog({ open, onOpenChange, timer }: EditTimerDialogProps) {
	const [name, setName] = useState(timer.name);
	const [client, setClient] = useState<SelectableItem | undefined>(
		timer.client ? { _id: timer.client._id, name: timer.client.name } : undefined,
	);
	const [project, setProject] = useState<SelectableItem | undefined>(
		timer.project ? { _id: timer.project._id, name: timer.project.name } : undefined,
	);
	const [category, setCategory] = useState<SelectableItem | undefined>(
		timer.category ? { _id: timer.category._id, name: timer.category.name } : undefined,
	);

	const elapsed = useLiveElapsedTime(timer.start_time ?? 0, true);

	const updateMutation = useMutation(api.time_entries.update).withOptimisticUpdate(optimisticUpdateTimeEntry);
	const updateClientMutation = useMutation(api.time_entries.updateClient).withOptimisticUpdate(optimisticUpdateTimeEntryClient);
	const updateProjectMutation = useMutation(api.time_entries.updateProject).withOptimisticUpdate(optimisticUpdateTimeEntryProject);
	const updateCategoryMutation = useMutation(api.time_entries.updateCategory).withOptimisticUpdate(optimisticUpdateTimeEntryCategory);
	const createClient = useMutation(api.clients.create);
	const createProject = useMutation(api.projects.create);
	const createCategory = useMutation(api.categories.create);

	// Sync state when timer data changes externally
	useEffect(() => {
		setName(timer.name);
		setClient(timer.client ? { _id: timer.client._id, name: timer.client.name } : undefined);
		setProject(timer.project ? { _id: timer.project._id, name: timer.project.name } : undefined);
		setCategory(timer.category ? { _id: timer.category._id, name: timer.category.name } : undefined);
	}, [timer._id, timer.name, timer.client, timer.project, timer.category]);

	const handleCreateClient = async (name: string) => {
		try {
			const id = await createClient({ name });
			setClient({ _id: id, name });
		} catch {
			toast.error("Failed to create client");
		}
	};

	const handleCreateProject = async (name: string) => {
		try {
			const id = await createProject({
				name,
				clientId: client?._id as Id<"clients"> | undefined,
			});
			setProject({ _id: id, name });
		} catch {
			toast.error("Failed to create project");
		}
	};

	const handleCreateCategory = async (name: string) => {
		try {
			const id = await createCategory({ name });
			setCategory({ _id: id, name });
		} catch {
			toast.error("Failed to create category");
		}
	};

	const handleSave = () => {
		const trimmedName = name.trim() || "New Time Entry";

		// Update name if changed
		if (trimmedName !== timer.name) {
			updateMutation({ id: timer._id, name: trimmedName })
				.catch(() => toast.error("Failed to update name"));
		}

		// Update client if changed
		const newClientId = client?._id as Id<"clients"> | undefined;
		if (newClientId !== timer.clientId) {
			updateClientMutation({ timeEntryId: timer._id, clientId: newClientId })
				.catch(() => toast.error("Failed to update client"));
		}

		// Update project if changed
		const newProjectId = project?._id as Id<"projects"> | undefined;
		if (newProjectId !== timer.projectId) {
			updateProjectMutation({ timeEntryId: timer._id, projectId: newProjectId })
				.catch(() => toast.error("Failed to update project"));
		}

		// Update category if changed
		const newCategoryId = category?._id as Id<"categories"> | undefined;
		if (newCategoryId !== timer.categoryId) {
			updateCategoryMutation({ timeEntryId: timer._id, categoryId: newCategoryId })
				.catch(() => toast.error("Failed to update category"));
		}

		onOpenChange(false);
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		handleSave();
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Edit Running Timer</DialogTitle>
					<p className="text-2xl font-semibold tabular-nums text-success">{elapsed}</p>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="flex flex-col gap-4">
					<div className="flex flex-col gap-2">
						<Label htmlFor="edit-timer-name">Name</Label>
						<Input
							id="edit-timer-name"
							autoFocus
							value={name}
							onChange={(e) => setName(e.target.value)}
							onFocus={(e) => e.target.select()}
						/>
					</div>
					<div className="flex flex-col gap-2">
						<Label>Client</Label>
						<SearchableCombobox
							apiQuery={api.clients.searchByName}
							value={client}
							onValueChange={(item) => {
								setClient(item);
								if (item?._id !== client?._id) {
									setProject(undefined);
								}
							}}
							onSelect={handleCreateClient}
							placeholder="Select client"
						/>
					</div>
					<div className="flex flex-col gap-2">
						<Label>Project</Label>
						<SearchableCombobox
							apiQuery={api.projects.searchByName}
							queryArgs={{
								clientId: client?._id as Id<"clients"> | undefined,
								query: "",
								paginationOpts: { numItems: 10, cursor: null },
							}}
							value={project}
							onValueChange={setProject}
							onSelect={handleCreateProject}
							placeholder="Select project"
						/>
					</div>
					<div className="flex flex-col gap-2">
						<Label>Category</Label>
						<SearchableCombobox
							apiQuery={api.categories.searchByName}
							value={category}
							onValueChange={setCategory}
							onSelect={handleCreateCategory}
							placeholder="Select category"
						/>
					</div>
					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
						<Button type="submit">Save</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
