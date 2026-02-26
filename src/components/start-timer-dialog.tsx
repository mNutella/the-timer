import { useState } from "react";
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
import { optimisticCreateTimer } from "@/lib/optimistic-updates";
import { toast } from "sonner";

interface StartTimerDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function StartTimerDialog({ open, onOpenChange }: StartTimerDialogProps) {
	const [name, setName] = useState("New Time Entry");
	const [client, setClient] = useState<SelectableItem | undefined>();
	const [project, setProject] = useState<SelectableItem | undefined>();
	const [category, setCategory] = useState<SelectableItem | undefined>();

	const createMutation = useMutation(api.time_entries.create).withOptimisticUpdate(optimisticCreateTimer);
	const createClient = useMutation(api.clients.create);
	const createProject = useMutation(api.projects.create);
	const createCategory = useMutation(api.categories.create);

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

	const resetForm = () => {
		setName("New Time Entry");
		setClient(undefined);
		setProject(undefined);
		setCategory(undefined);
	};

	const handleOpenChange = (nextOpen: boolean) => {
		if (!nextOpen) resetForm();
		onOpenChange(nextOpen);
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		createMutation({
			name: name.trim() || "New Time Entry",
			clientId: client?._id as Id<"clients"> | undefined,
			projectId: project?._id as Id<"projects"> | undefined,
			categoryId: category?._id as Id<"categories"> | undefined,
		}).catch(() => toast.error("Failed to start timer"));
		handleOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Start Timer</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="flex flex-col gap-4">
					<div className="flex flex-col gap-2">
						<Label htmlFor="timer-name">Name</Label>
						<Input
							id="timer-name"
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
						<Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
							Cancel
						</Button>
						<Button type="submit">Start</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
