"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";

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
import { formatDuration } from "@/lib/utils";

interface EntityBase {
	_id: string;
	name: string;
	totalDuration: number;
}

interface ColumnDef<T extends EntityBase> {
	header: string;
	className?: string;
	render: (entity: T) => ReactNode;
}

interface EntityManagementTableProps<T extends EntityBase> {
	/** Plural entity label, e.g. "clients" */
	entityLabel: string;
	/** Singular entity label, e.g. "client" */
	entityLabelSingular: string;
	/** Data from the list query */
	data: T[] | undefined;
	/** Extra columns between Name and Total Hours */
	extraColumns?: ColumnDef<T>[];
	/** Extra filters rendered between search/date and the add button */
	extraFilters?: ReactNode;
	/** Delete confirmation description */
	deleteDescription?: (name: string) => string;
	/** Search state */
	searchValue: string;
	onSearchChange: (value: string) => void;
	/** Date range state */
	dateRange: DateRange | undefined;
	onDateRangeChange: (value: DateRange | undefined) => void;
	/** CRUD callbacks - these should already be wrapped with withToast */
	onCreate: (name: string) => void;
	onUpdate: (id: string, name: string) => void;
	onDelete: (id: string) => void;
}

export function EntityManagementTable<T extends EntityBase>({
	entityLabel,
	entityLabelSingular,
	data,
	extraColumns = [],
	extraFilters,
	deleteDescription,
	searchValue,
	onSearchChange,
	dateRange,
	onDateRangeChange,
	onCreate,
	onUpdate,
	onDelete,
}: EntityManagementTableProps<T>) {
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editValue, setEditValue] = useState("");
	const [newName, setNewName] = useState("");
	const [isAdding, setIsAdding] = useState(false);
	const [deleteTarget, setDeleteTarget] = useState<{
		id: string;
		name: string;
	} | null>(null);

	const filteredData = useMemo(() => {
		if (!data) return undefined;
		if (!searchValue.trim()) return data;
		const query = searchValue.toLowerCase();
		return data.filter((item) => item.name.toLowerCase().includes(query));
	}, [data, searchValue]);

	const handleCreate = () => {
		if (!newName.trim()) return;
		onCreate(newName.trim());
		setNewName("");
		setIsAdding(false);
	};

	const handleStartEdit = (id: string, name: string) => {
		setEditingId(id);
		setEditValue(name);
	};

	const handleSaveEdit = () => {
		if (!editingId || !editValue.trim()) return;
		onUpdate(editingId, editValue.trim());
		setEditingId(null);
		setEditValue("");
	};

	const handleDelete = () => {
		if (!deleteTarget) return;
		onDelete(deleteTarget.id);
		setDeleteTarget(null);
	};

	const totalColSpan = 3 + extraColumns.length;
	const capitalize =
		entityLabelSingular.charAt(0).toUpperCase() + entityLabelSingular.slice(1);

	return (
		<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
			<div className="px-4 lg:px-6">
				<div className="flex items-center justify-between mb-4">
					<div className="flex items-center gap-2">
						<TimerEntrySearch value={searchValue} onChange={onSearchChange} />
						{extraFilters}
						<TimeRangeFilter value={dateRange} onChange={onDateRangeChange} />
					</div>
					{isAdding ? (
						<div className="flex items-center gap-2">
							<Input
								autoFocus
								placeholder={`${capitalize} name`}
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
							<Plus className="size-4" />
							Add {capitalize}
						</Button>
					)}
				</div>

				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Name</TableHead>
							{extraColumns.map((col) => (
								<TableHead key={col.header} className={col.className}>
									{col.header}
								</TableHead>
							))}
							<TableHead className="w-36">Total Hours</TableHead>
							<TableHead className="w-24 text-right">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{filteredData?.length === 0 && (
							<TableRow>
								<TableCell
									colSpan={totalColSpan}
									className="text-center text-muted-foreground py-8"
								>
									{data?.length === 0
										? `No ${entityLabel} yet. Add one to get started.`
										: `No ${entityLabel} match your search.`}
								</TableCell>
							</TableRow>
						)}
						{filteredData?.map((entity) => (
							<TableRow key={entity._id}>
								<TableCell>
									{editingId === entity._id ? (
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
										<span className="font-medium">{entity.name}</span>
									)}
								</TableCell>
								{extraColumns.map((col) => (
									<TableCell key={col.header}>{col.render(entity)}</TableCell>
								))}
								<TableCell className="text-muted-foreground tabular-nums">
									{formatDuration(entity.totalDuration)}
								</TableCell>
								<TableCell className="text-right">
									<div className="flex items-center justify-end gap-1">
										<Button
											size="icon"
											variant="ghost"
											className="size-7"
											onClick={() => handleStartEdit(entity._id, entity.name)}
										>
											<Pencil className="size-3.5" />
										</Button>
										<Button
											size="icon"
											variant="ghost"
											className="size-7 text-destructive hover:text-destructive"
											onClick={() =>
												setDeleteTarget({
													id: entity._id,
													name: entity.name,
												})
											}
										>
											<Trash2 className="size-3.5" />
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
				onOpenChange={(open: boolean) => !open && setDeleteTarget(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete {entityLabelSingular}</AlertDialogTitle>
						<AlertDialogDescription>
							{deleteDescription
								? deleteDescription(deleteTarget?.name ?? "")
								: `Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
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
