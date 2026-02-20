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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { formatDuration, withToast } from "@/lib/utils";

export const Route = createFileRoute("/(app)/categories")({
	component: CategoriesPage,
});

function CategoriesPage() {
	const userId = import.meta.env.VITE_USER_ID as Id<"users">;
	const [searchValue, setSearchValue] = useState("");
	const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

	const categories = useQuery(api.categories.list, {
		userId,
		dateRange:
			dateRange?.from && dateRange?.to
				? {
						startDate: dateRange.from.getTime(),
						endDate: dateRange.to.getTime(),
					}
				: undefined,
	});
	const createCategory = useMutation(api.categories.create);
	const updateCategory = useMutation(api.categories.update);
	const deleteCategory = useMutation(api.categories.deleteOne);

	const [editingId, setEditingId] = useState<Id<"categories"> | null>(null);
	const [editValue, setEditValue] = useState("");
	const [newName, setNewName] = useState("");
	const [isAdding, setIsAdding] = useState(false);
	const [deleteTarget, setDeleteTarget] = useState<{
		id: Id<"categories">;
		name: string;
	} | null>(null);

	const filteredCategories = useMemo(() => {
		if (!categories) return undefined;
		if (!searchValue.trim()) return categories;
		const query = searchValue.toLowerCase();
		return categories.filter((c) => c.name.toLowerCase().includes(query));
	}, [categories, searchValue]);

	const handleCreate = () => {
		if (!newName.trim()) return;
		withToast(
			createCategory,
			"Creating category...",
			"Category created",
			"Failed to create category",
		)({ name: newName.trim(), userId });
		setNewName("");
		setIsAdding(false);
	};

	const handleStartEdit = (id: Id<"categories">, name: string) => {
		setEditingId(id);
		setEditValue(name);
	};

	const handleSaveEdit = () => {
		if (!editingId || !editValue.trim()) return;
		withToast(
			updateCategory,
			"Updating category...",
			"Category updated",
			"Failed to update category",
		)({ id: editingId, userId, name: editValue.trim() });
		setEditingId(null);
		setEditValue("");
	};

	const handleDelete = () => {
		if (!deleteTarget) return;
		withToast(
			deleteCategory,
			"Deleting category...",
			"Category deleted",
			"Failed to delete category",
		)({ id: deleteTarget.id, userId });
		setDeleteTarget(null);
	};

	return (
		<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
			<div className="px-4 lg:px-6">
				<div className="flex items-center justify-between mb-4">
					<div className="flex items-center gap-2">
						<TimerEntrySearch value={searchValue} onChange={setSearchValue} />
						<TimeRangeFilter value={dateRange} onChange={setDateRange} />
					</div>
					{isAdding ? (
						<div className="flex items-center gap-2">
							<Input
								autoFocus
								placeholder="Category name"
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
							Add Category
						</Button>
					)}
				</div>

				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Name</TableHead>
							<TableHead className="w-36">Total Hours</TableHead>
							<TableHead className="w-24 text-right">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{filteredCategories?.length === 0 && (
							<TableRow>
								<TableCell
									colSpan={3}
									className="text-center text-muted-foreground py-8"
								>
									{categories?.length === 0
										? "No categories yet. Add one to get started."
										: "No categories match your search."}
								</TableCell>
							</TableRow>
						)}
						{filteredCategories?.map((category) => (
							<TableRow key={category._id}>
								<TableCell>
									{editingId === category._id ? (
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
										<span className="font-medium">{category.name}</span>
									)}
								</TableCell>
								<TableCell className="text-muted-foreground tabular-nums">
									{formatDuration(category.totalDuration)}
								</TableCell>
								<TableCell className="text-right">
									<div className="flex items-center justify-end gap-1">
										<Button
											size="icon"
											variant="ghost"
											className="size-7"
											onClick={() =>
												handleStartEdit(category._id, category.name)
											}
										>
											<IconPencil className="size-3.5" />
										</Button>
										<Button
											size="icon"
											variant="ghost"
											className="size-7 text-destructive hover:text-destructive"
											onClick={() =>
												setDeleteTarget({
													id: category._id,
													name: category.name,
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
						<AlertDialogTitle>Delete category</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete "{deleteTarget?.name}"? Time
							entries linked to this category will lose their category
							reference. This action cannot be undone.
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
