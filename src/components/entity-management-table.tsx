"use client";

import { Clock, Inbox, Pencil, Plus, Search, Trash2, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";

import { TimeRangeFilter } from "@/components/time-entry-filters";
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
import { Card, CardContent } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
	/** Icon for summary strip */
	icon: LucideIcon;
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
	icon: Icon,
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
	const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
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

	const totalHours = useMemo(() => {
		if (!data) return 0;
		const totalMs = data.reduce((sum, item) => sum + item.totalDuration, 0);
		return totalMs / 3600000;
	}, [data]);

	const handleCreate = () => {
		if (!newName.trim()) return;
		onCreate(newName.trim());
		setNewName("");
		setIsAddDialogOpen(false);
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

	const capitalize =
		entityLabelSingular.charAt(0).toUpperCase() + entityLabelSingular.slice(1);
	const capitalizeLabel =
		entityLabel.charAt(0).toUpperCase() + entityLabel.slice(1);

	return (
		<div className="flex flex-col flex-1 min-h-0 gap-4 py-4 md:gap-6 md:py-6">
			<div className="shrink-0">
				{/* Page Header */}
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-semibold tracking-tight">
							{capitalizeLabel}
						</h1>
						<p className="mt-1 text-sm text-muted-foreground">
							Manage your {entityLabel} and track time across them.
						</p>
					</div>
					<Button onClick={() => setIsAddDialogOpen(true)}>
						<Plus className="size-4" />
						Add {capitalize}
					</Button>
				</div>

				{/* Summary Strip */}
				<div className="mt-4 rounded-xl border border-border bg-card">
					<div className="grid grid-cols-1 divide-y divide-border @xl/main:grid-cols-2 @xl/main:divide-y-0 @xl/main:divide-x">
						{/* Entity Count */}
						<div className="flex items-center gap-4 px-4 py-4 lg:px-6">
							<div className="flex size-11 items-center justify-center rounded-xl bg-success/10">
								<Icon className="size-5 text-success" />
							</div>
							<div>
								<p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
									Total {capitalizeLabel}
								</p>
								<p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
									{data ? data.length : "--"}
								</p>
							</div>
						</div>

						{/* Total Hours */}
						<div className="flex items-center gap-3 px-4 py-4 @xl/main:pl-6 lg:px-6">
							<div className="flex size-8 items-center justify-center rounded-lg bg-muted">
								<Clock className="size-4 text-muted-foreground" />
							</div>
							<div>
								<p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
									Total Hours
								</p>
								<p className="mt-0.5 text-xl font-semibold tabular-nums">
									{totalHours > 0 ? `${totalHours.toFixed(1)}h` : "--"}
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>

				{/* Card-wrapped Table */}
				<Card className="mt-4 md:mt-6 flex flex-col flex-1 min-h-0 overflow-hidden">
					<CardContent className="p-0 flex flex-col flex-1 min-h-0">
						{/* Filter Bar */}
						<div className="shrink-0 flex items-center gap-2 px-4 py-3 lg:px-6">
							<div className="relative flex-1 max-w-sm">
								<Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
								<Input
									placeholder={`Search ${entityLabel}...`}
									value={searchValue}
									onChange={(e) => onSearchChange(e.target.value)}
									className="h-9 pl-8"
								/>
							</div>
							{extraFilters && (
								<>
									<Separator orientation="vertical" className="h-6" />
									{extraFilters}
								</>
							)}
							<Separator orientation="vertical" className="h-6" />
							<TimeRangeFilter value={dateRange} onChange={onDateRangeChange} />
						</div>

						<Separator className="shrink-0" />

						<div className="flex-1 min-h-0 overflow-y-auto">
						{/* Empty state: no entities exist */}
						{data?.length === 0 && (
							<div className="flex flex-col items-center justify-center py-16 text-center">
								<div className="flex size-12 items-center justify-center rounded-xl bg-muted">
									<Inbox className="size-6 text-muted-foreground" />
								</div>
								<h3 className="mt-4 text-sm font-medium">
									No {entityLabel} yet
								</h3>
								<p className="mt-1 text-sm text-muted-foreground">
									Create your first {entityLabelSingular} to start tracking.
								</p>
								<Button
									className="mt-4"
									size="sm"
									onClick={() => setIsAddDialogOpen(true)}
								>
									<Plus className="size-4" />
									Add {capitalize}
								</Button>
							</div>
						)}

						{/* No results state: search has no matches */}
						{data && data.length > 0 && filteredData?.length === 0 && (
							<div className="flex flex-col items-center justify-center py-16 text-center">
								<div className="flex size-12 items-center justify-center rounded-xl bg-muted">
									<Search className="size-6 text-muted-foreground" />
								</div>
								<h3 className="mt-4 text-sm font-medium">No results found</h3>
								<p className="mt-1 text-sm text-muted-foreground">
									No {entityLabel} match your search.
								</p>
							</div>
						)}

						{/* Table */}
						{filteredData && filteredData.length > 0 && (
							<Table>
								<TableHeader className="bg-card sticky top-0 z-10">
									<TableRow>
										<TableHead className="pl-4 lg:pl-6">Name</TableHead>
										{extraColumns.map((col) => (
											<TableHead key={col.header} className={col.className}>
												{col.header}
											</TableHead>
										))}
										<TableHead className="w-36">Total Hours</TableHead>
										<TableHead className="w-24 pr-4 text-right lg:pr-6">
											Actions
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{filteredData.map((entity) => (
										<TableRow key={entity._id}>
											<TableCell className="pl-4 lg:pl-6">
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
												<TableCell key={col.header}>
													{col.render(entity)}
												</TableCell>
											))}
											<TableCell className="text-muted-foreground tabular-nums">
												{formatDuration(entity.totalDuration)}
											</TableCell>
											<TableCell className="pr-4 text-right lg:pr-6">
												<div className="flex items-center justify-end gap-1">
													<Button
														size="icon"
														variant="ghost"
														className="size-7"
														onClick={() =>
															handleStartEdit(entity._id, entity.name)
														}
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
						)}
						</div>
					</CardContent>
				</Card>

			{/* Add Dialog */}
			<Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Add {capitalize}</DialogTitle>
						<DialogDescription>
							Create a new {entityLabelSingular} to organize your time entries.
						</DialogDescription>
					</DialogHeader>
					<div className="grid gap-2">
						<Label htmlFor="entity-name">Name</Label>
						<Input
							id="entity-name"
							autoFocus
							placeholder={`${capitalize} name`}
							value={newName}
							onChange={(e) => setNewName(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") handleCreate();
							}}
						/>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => {
								setIsAddDialogOpen(false);
								setNewName("");
							}}
						>
							Cancel
						</Button>
						<Button onClick={handleCreate} disabled={!newName.trim()}>
							Create
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Delete AlertDialog */}
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
