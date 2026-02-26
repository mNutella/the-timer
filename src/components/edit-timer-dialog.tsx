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
import { parseDurationToMilliseconds } from "@/lib/utils";
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

function toSelectableItem(
	entity: { _id: string; name: string } | null,
): SelectableItem | undefined {
	return entity ?? undefined;
}

export function EditTimerDialog({ open, onOpenChange, timer }: EditTimerDialogProps) {
	const [name, setName] = useState(timer.name);
	const [client, setClient] = useState<SelectableItem | undefined>(
		toSelectableItem(timer.client),
	);
	const [project, setProject] = useState<SelectableItem | undefined>(
		toSelectableItem(timer.project),
	);
	const [category, setCategory] = useState<SelectableItem | undefined>(
		toSelectableItem(timer.category),
	);

	const [durationFocused, setDurationFocused] = useState(false);
	const [durationEdited, setDurationEdited] = useState(false);
	const [durationStr, setDurationStr] = useState("");

	const elapsed = useLiveElapsedTime(timer.start_time ?? 0, !durationFocused && !durationEdited);

	const updateMutation = useMutation(api.time_entries.update).withOptimisticUpdate(optimisticUpdateTimeEntry);
	const updateClientMutation = useMutation(api.time_entries.updateClient).withOptimisticUpdate(optimisticUpdateTimeEntryClient);
	const updateProjectMutation = useMutation(api.time_entries.updateProject).withOptimisticUpdate(optimisticUpdateTimeEntryProject);
	const updateCategoryMutation = useMutation(api.time_entries.updateCategory).withOptimisticUpdate(optimisticUpdateTimeEntryCategory);
	const createClient = useMutation(api.clients.create);
	const createProject = useMutation(api.projects.create);
	const createCategory = useMutation(api.categories.create);

	useEffect(() => {
		if (!open) return;
		setName(timer.name);
		setClient(toSelectableItem(timer.client));
		setProject(toSelectableItem(timer.project));
		setCategory(toSelectableItem(timer.category));
		setDurationFocused(false);
		setDurationEdited(false);
		setDurationStr("");
	}, [open, timer._id, timer.name, timer.client?._id, timer.project?._id, timer.category?._id]);

	const handleCreateClient = async (entityName: string) => {
		try {
			const id = await createClient({ name: entityName });
			setClient({ _id: id, name: entityName });
		} catch {
			toast.error("Failed to create client");
		}
	};

	const handleCreateProject = async (entityName: string) => {
		try {
			const id = await createProject({
				name: entityName,
				clientId: client?._id as Id<"clients"> | undefined,
			});
			setProject({ _id: id, name: entityName });
		} catch {
			toast.error("Failed to create project");
		}
	};

	const handleCreateCategory = async (entityName: string) => {
		try {
			const id = await createCategory({ name: entityName });
			setCategory({ _id: id, name: entityName });
		} catch {
			toast.error("Failed to create category");
		}
	};

	const handleSave = () => {
		const trimmedName = name.trim() || "New Time Entry";

		// Compute new start time from edited duration
		const editedDurationMs = parseDurationToMilliseconds(durationStr);
		const newStartTime = editedDurationMs > 0 ? Date.now() - editedDurationMs : null;
		const startTimeChanged = newStartTime !== null && Math.abs(newStartTime - (timer.start_time ?? 0)) > 1000;

		if (trimmedName !== timer.name || startTimeChanged) {
			updateMutation({
				id: timer._id,
				name: trimmedName,
				...(startTimeChanged && { startDate: newStartTime }),
			}).catch(() => toast.error("Failed to update timer"));
		}

		const newClientId = client?._id as Id<"clients"> | undefined;
		if (newClientId !== timer.clientId) {
			updateClientMutation({ timeEntryId: timer._id, clientId: newClientId })
				.catch(() => toast.error("Failed to update client"));
		}

		const newProjectId = project?._id as Id<"projects"> | undefined;
		if (newProjectId !== timer.projectId) {
			updateProjectMutation({ timeEntryId: timer._id, projectId: newProjectId })
				.catch(() => toast.error("Failed to update project"));
		}

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
				</DialogHeader>
				<form onSubmit={handleSubmit} className="flex flex-col gap-4">
					<div className="flex flex-col gap-2">
						<Label htmlFor="edit-timer-duration">Duration</Label>
						<Input
							id="edit-timer-duration"
							value={durationFocused || durationEdited ? durationStr : elapsed}
							onChange={(e) => {
								setDurationStr(e.target.value);
								setDurationEdited(true);
							}}
							onFocus={(e) => {
								if (!durationEdited) setDurationStr(elapsed);
								setDurationFocused(true);
								e.target.select();
							}}
							onBlur={() => setDurationFocused(false)}
							className="tabular-nums text-success font-semibold"
						/>
					</div>
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
