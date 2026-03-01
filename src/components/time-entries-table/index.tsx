import {
	type Column,
	type ColumnDef,
	type ColumnFiltersState,
	flexRender,
	getCoreRowModel,
	getFacetedRowModel,
	getFacetedUniqueValues,
	getFilteredRowModel,
	getSortedRowModel,
	type OnChangeFn,
	type Row,
	type SortingState,
	useReactTable,
	type VisibilityState,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowDown, ArrowUp, ChevronsUpDown, Download } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ComponentProps, CSSProperties } from "react";
import type { DateRange } from "react-day-picker";

import type { Id } from "@/../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { Category, Client, Project, TimeEntry } from "@/lib/types";
import { cn } from "@/lib/utils";

import { ActionsCell } from "./actions-cell";
import { BulkActionsBar } from "./bulk-actions-bar";
import { CategoryCell } from "./category-cell";
import { ClientCell } from "./client-cell";
import { CustomizeTableMenu } from "./customize-table-menu";
import { DurationCell } from "./duration-cell";
import { ExportDialog } from "./export-dialog";
import { useTimeEntries } from "./hooks";
import { ProjectCell } from "./project-cell";
import { StartEndTimeCell } from "./start-end-time-cell";
import { StartStopCell } from "./start-stop-cell";
import { TimeEntryCell } from "./time-entry-cell";

function SortableHeader<T>({ column, title }: { column: Column<T>; title: string }) {
	const sorted = column.getIsSorted();
	return (
		<Button
			variant="ghost"
			size="sm"
			className="-ml-3 h-8"
			onClick={() => {
				if (sorted === "desc") {
					column.clearSorting();
				} else {
					column.toggleSorting(sorted === "asc");
				}
			}}
		>
			{title}
			{sorted === "asc" ? (
				<ArrowUp className="ml-1 h-3.5 w-3.5" />
			) : sorted === "desc" ? (
				<ArrowDown className="ml-1 h-3.5 w-3.5" />
			) : (
				<ChevronsUpDown className="ml-1 h-3.5 w-3.5 opacity-50" />
			)}
		</Button>
	);
}

const columns: ColumnDef<TimeEntry>[] = [
	{
		id: "select",
		header: ({ table }) => (
			<Checkbox
				checked={
					table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")
				}
				onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
				aria-label="Select all"
			/>
		),
		cell: ({ row }) => (
			<Checkbox
				checked={row.getIsSelected()}
				onCheckedChange={(value) => row.toggleSelected(!!value)}
				aria-label="Select row"
			/>
		),
		enableSorting: false,
		enableHiding: false,
	},
	{
		accessorKey: "name",
		header: ({ column }) => <SortableHeader column={column} title="Name" />,
		cell: ({ row }) => (
			<TimeEntryCell
				timeEntryId={row.original._id}
				timeEntryName={row.original.name}
				notes={row.original.notes}
			/>
		),
		enableHiding: false,
	},
	{
		accessorKey: "client",
		header: ({ column }) => <SortableHeader column={column} title="Client" />,
		cell: ({ row }) => <ClientCell timeEntryId={row.original._id} client={row.original.client} />,
		sortingFn: (rowA, rowB) => {
			const a = rowA.original.client?.name ?? "";
			const b = rowB.original.client?.name ?? "";
			return a.localeCompare(b);
		},
	},
	{
		accessorKey: "project",
		header: ({ column }) => <SortableHeader column={column} title="Project" />,
		cell: ({ row }) => (
			<ProjectCell
				timeEntryId={row.original._id}
				clientId={row.original.client?._id}
				project={row.original.project}
			/>
		),
		sortingFn: (rowA, rowB) => {
			const a = rowA.original.project?.name ?? "";
			const b = rowB.original.project?.name ?? "";
			return a.localeCompare(b);
		},
	},
	{
		accessorKey: "category",
		header: ({ column }) => <SortableHeader column={column} title="Category" />,
		cell: ({ row }) => (
			<CategoryCell timeEntryId={row.original._id} category={row.original.category} />
		),
		sortingFn: (rowA, rowB) => {
			const a = rowA.original.category?.name ?? "";
			const b = rowB.original.category?.name ?? "";
			return a.localeCompare(b);
		},
	},
	{
		accessorKey: "duration",
		header: ({ column }) => <SortableHeader column={column} title="Duration" />,
		cell: ({ row }) => (
			<DurationCell
				timeEntryId={row.original._id}
				duration={row.original.duration ?? 0}
				startTime={row.original.start_time ?? 0}
				inProgress={!row.original.end_time}
			/>
		),
		sortingFn: (rowA, rowB) => {
			const a = rowA.original.duration ?? 0;
			const b = rowB.original.duration ?? 0;
			return a - b;
		},
	},
	{
		accessorKey: "start_end_time",
		header: ({ column }) => <SortableHeader column={column} title="Start/End Time" />,
		cell: ({ row }) => (
			<StartEndTimeCell
				timeEntryId={row.original._id}
				startTime={row.original.start_time ?? 0}
				endTime={row.original.end_time ?? 0}
			/>
		),
		sortingFn: (rowA, rowB) => {
			const a = rowA.original.start_time ?? 0;
			const b = rowB.original.start_time ?? 0;
			return a - b;
		},
	},
	{
		id: "start_stop_timer",
		enableSorting: false,
		cell: ({ row }) => (
			<div className="flex h-full w-full items-center justify-center">
				<StartStopCell timeEntryId={row.original._id} inProgress={!row.original.end_time} />
			</div>
		),
	},
	{
		id: "actions",
		enableSorting: false,
		cell: ({ row }) => (
			<ActionsCell
				timeEntryId={row.original._id}
				entryName={row.original.name}
				notes={row.original.notes}
			/>
		),
	},
];

function CustomRow({
	row,
	className,
	style,
	virtualRowIndex,
	ref,
}: {
	row: Row<TimeEntry>;
	className?: string;
	style?: CSSProperties;
	virtualRowIndex: number;
	ref?: ComponentProps<"tr">["ref"];
}) {
	return (
		<TableRow
			ref={ref}
			data-index={virtualRowIndex}
			data-state={row.getIsSelected() && "selected"}
			className={className}
			style={style}
		>
			{row.getVisibleCells().map((cell) => (
				<TableCell
					key={cell.id}
					className={cn("flex justify-start items-center overflow-hidden min-w-0")}
				>
					{flexRender(cell.column.columnDef.cell, cell.getContext())}
				</TableCell>
			))}
		</TableRow>
	);
}

interface TimeEntriesTableProps {
	searchValue: string;
	filterByClients: Client[];
	filterByProjects: Project[];
	filterByCategories: Category[];
	filterByTimeRange?: DateRange;
}

export default function TimeEntriesTable({
	searchValue,
	filterByClients,
	filterByProjects,
	filterByCategories,
	filterByTimeRange,
}: TimeEntriesTableProps) {
	const {
		results: initialData,
		loadMore,
		isLoading,
		status,
	} = useTimeEntries(
		searchValue,
		filterByClients,
		filterByProjects,
		filterByCategories,
		filterByTimeRange,
	);
	const scrollAreaRef = useRef<HTMLDivElement>(null);
	const loaderRef = useRef<HTMLTableCellElement>(null);
	const [exportOpen, setExportOpen] = useState(false);
	const [rowSelection, setRowSelection] = useState({});
	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
	const [sorting, setSorting] = useState<SortingState>([]);

	useEffect(() => {
		if (status !== "CanLoadMore" || !loaderRef.current || !scrollAreaRef.current) return;

		const observer = new IntersectionObserver(
			(entries) => {
				const [entry] = entries;
				if (entry.isIntersecting) {
					loadMore(5);
				}
			},
			{
				root: scrollAreaRef.current,
				threshold: 0.1,
			},
		);

		observer.observe(loaderRef.current);

		return () => observer.disconnect();
	}, [status, loadMore]);

	const table = useReactTable({
		data: initialData,
		columns,
		state: {
			sorting,
			columnVisibility,
			rowSelection,
			columnFilters,
		},
		getRowId: (row) => row._id.toString(),
		enableRowSelection: true,
		onRowSelectionChange: setRowSelection,
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		onColumnVisibilityChange: setColumnVisibility,
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFacetedRowModel: getFacetedRowModel(),
		getFacetedUniqueValues: getFacetedUniqueValues(),
	});

	const handleSortingChange: OnChangeFn<SortingState> = (updater) => {
		setSorting(updater);
		if (table.getRowModel().rows.length) {
			rowVirtualizer.scrollToIndex?.(0);
		}
	};

	table.setOptions((prev) => ({
		...prev,
		onSortingChange: handleSortingChange,
	}));

	const { rows } = table.getRowModel();

	// Build grid template so table fills width while keeping specific columns small
	const headerGroups = table.getHeaderGroups();
	const gridTemplateColumns = useMemo(() => {
		if (!headerGroups.length) return undefined as CSSProperties["gridTemplateColumns"];
		const headers = headerGroups[0].headers;
		const parts = headers.map((h) => {
			const colId = (h.column.columnDef.id ?? h.column.id) as string;
			switch (colId) {
				case "select":
					return "40px";
				case "name":
					return "minmax(100px, 2fr)";
				case "client":
				case "project":
				case "category":
					return "minmax(80px, 1fr)";
				case "duration":
					return "120px";
				case "start_end_time":
					return "minmax(120px, 1.5fr)";
				case "start_stop_timer":
					return "64px";
				case "actions":
					return "56px";
				default:
					return "minmax(0,1fr)";
			}
		});
		return parts.join(" ");
	}, [headerGroups]);

	const rowVirtualizer = useVirtualizer({
		count: rows.length,
		estimateSize: () => 72,
		getScrollElement: () => scrollAreaRef.current,
		measureElement:
			typeof window !== "undefined" && navigator.userAgent.indexOf("Firefox") === -1
				? (element) => element?.getBoundingClientRect().height
				: undefined,
		overscan: 5,
	});

	return (
		<div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
			<ExportDialog
				open={exportOpen}
				onOpenChange={setExportOpen}
				searchValue={searchValue}
				filterByClients={filterByClients}
				filterByProjects={filterByProjects}
				filterByCategories={filterByCategories}
				filterByTimeRange={filterByTimeRange}
			/>
			<div className="flex min-h-0 flex-1 flex-col pb-2">
				<div className="min-h-0 flex-1 overflow-hidden rounded-lg border">
					<div className="flex shrink-0 items-center gap-2 border-b border-border bg-card px-4 py-2">
						<BulkActionsBar
							selectedCount={table.getFilteredSelectedRowModel().rows.length}
							totalCount={table.getFilteredRowModel().rows.length}
							selectedIds={
								table
									.getFilteredSelectedRowModel()
									.rows.map((r) => r.original._id) as Id<"time_entries">[]
							}
							onClearSelection={() => table.resetRowSelection()}
						/>
						<div className="ml-auto flex items-center gap-2">
							<Button variant="outline" size="sm" onClick={() => setExportOpen(true)}>
								<Download className="size-4" />
								<span className="hidden lg:inline">Export</span>
							</Button>
							<CustomizeTableMenu table={table} />
						</div>
					</div>
					<div ref={scrollAreaRef} className="h-full overflow-y-auto">
						<Table className="grid">
							<TableHeader className="sticky top-0 z-10 grid bg-muted">
								{table.getHeaderGroups().map((headerGroup) => (
									<TableRow
										key={headerGroup.id}
										className="grid w-full"
										style={{ gridTemplateColumns }}
									>
										{headerGroup.headers.map((header) => {
											return (
												<TableHead
													key={header.id}
													colSpan={header.colSpan}
													className={cn(
														"flex justify-start items-center overflow-hidden",
														header.id !== "select" &&
															header.id !== "start_stop_timer" &&
															header.id !== "actions" &&
															"pl-6",
													)}
												>
													{header.isPlaceholder
														? null
														: flexRender(header.column.columnDef.header, header.getContext())}
												</TableHead>
											);
										})}
									</TableRow>
								))}
							</TableHeader>
							<TableBody
								className={cn(
									"w-full grid relative transition-opacity duration-200",
									isLoading && initialData.length > 0 && "opacity-50",
								)}
								style={{
									height: rowVirtualizer.getVirtualItems().length
										? `${rowVirtualizer.getTotalSize()}px`
										: "auto",
								}}
							>
								{rowVirtualizer.getVirtualItems().length ? (
									rowVirtualizer.getVirtualItems().map((virtualRow) => {
										const row = rows[virtualRow.index];
										return (
											<CustomRow
												virtualRowIndex={virtualRow.index}
												ref={(node) => rowVirtualizer.measureElement(node)}
												key={row.id}
												row={row}
												className="absolute grid w-full"
												style={{
													transform: `translateY(${virtualRow.start}px)`,
													gridTemplateColumns,
												}}
											/>
										);
									})
								) : (
									<TableRow>
										<TableCell
											colSpan={columns.length}
											className="flex h-24 items-center justify-center text-center"
										>
											No results.
										</TableCell>
									</TableRow>
								)}
								{status === "CanLoadMore" && (
									<TableRow
										className="absolute flex w-full"
										style={{
											transform: `translateY(${rowVirtualizer.getTotalSize() - 1}px)`,
										}}
									>
										<TableCell ref={loaderRef} className="h-4 w-full" colSpan={columns.length} />
									</TableRow>
								)}
							</TableBody>
						</Table>
					</div>
				</div>
			</div>
		</div>
	);
}
