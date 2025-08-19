import * as React from "react";
import { IconChevronDown, IconLayoutColumns } from "@tabler/icons-react";
import {
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
import type { UsePaginatedQueryReturnType } from "convex/react";

// import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ActivityCell } from "./activity-cell";
import { ClientCell } from "./client-cell";
import { ProjectCell } from "./project-cell";
import { CategoryCell } from "./category-cell";
import { DurationCell } from "./duration-cell";
import { StartEndTimeCell } from "./start-end-time-cell";
import type { api } from "convex/_generated/api";
import { ScrollArea } from "../ui/scroll-area";
import { ActionsCell } from "./actions-cell";
import { StartStopCell } from "./start-stop-cell";

type TimeEntriesPaginatedResult = UsePaginatedQueryReturnType<
	typeof api.time_entries.getAll
>;
type TimeEntry = TimeEntriesPaginatedResult["results"][number];

const columns: ColumnDef<TimeEntry>[] = [
	{
		id: "select",
		header: ({ table }) => (
			<div className="flex items-center justify-center">
				<Checkbox
					checked={
						table.getIsAllRowsSelected() ||
						(table.getIsSomeRowsSelected() && "indeterminate")
					}
					onCheckedChange={(value) => table.toggleAllRowsSelected(!!value)}
					aria-label="Select all"
				/>
			</div>
		),
		cell: ({ row }) => (
			<div className="flex items-center justify-center">
				<Checkbox
					checked={row.getIsSelected()}
					onCheckedChange={(value) => row.toggleSelected(!!value)}
					aria-label="Select row"
				/>
			</div>
		),
		enableSorting: false,
		enableHiding: false,
	},
	{
		accessorKey: "activity",
		header: "Activity",
		cell: ({ row }) => (
			<ActivityCell
				activityId={row.original.activity._id}
				activityName={row.original.activity.name}
			/>
		),
		enableHiding: false,
	},
	{
		accessorKey: "client",
		header: "Client",
		cell: ({ row }) => (
			<ClientCell
				timeEntryId={row.original._id}
				activityId={row.original.activity._id}
				client={row.original.activity.client}
			/>
		),
	},
	{
		accessorKey: "project",
		header: "Project",
		cell: ({ row }) => (
			<ProjectCell
				timeEntryId={row.original._id}
				activityId={row.original.activity._id}
				clientId={row.original.activity.client?._id}
				project={row.original.activity.project}
			/>
		),
	},
	{
		accessorKey: "category",
		header: "Category",
		cell: ({ row }) => (
			<CategoryCell
				timeEntryId={row.original._id}
				activityId={row.original.activity._id}
				category={row.original.activity.category}
			/>
		),
	},
	// {
	// 	accessorKey: "tags",
	// 	header: "Tags",
	// 	cell: ({ row }) => (
	// 		<div className="flex items-center gap-1">
	// 			{row.original.activity.tags?.map((tag) => (
	// 				<Badge
	// 					key={tag._id}
	// 					variant="outline"
	// 					className="text-muted-foreground px-1.5"
	// 				>
	// 					{tag.name}
	// 				</Badge>
	// 			)) || "No tags"}
	// 		</div>
	// 	),
	// },
	{
		accessorKey: "duration",
		header: "Duration",
		cell: ({ row }) => (
			<DurationCell
				timeEntryId={row.original._id}
				duration={row.original.duration ?? 0}
				startTime={row.original.start_time}
				inProgress={!row.original.end_time}
			/>
		),
	},
	{
		accessorKey: "start_end_time",
		header: "Start/End Time",
		cell: ({ row }) => (
			<StartEndTimeCell
				timeEntryId={row.original._id}
				startTime={row.original.start_time}
				endTime={row.original.end_time ?? 0}
			/>
		),
	},
	{
		id: "start_stop_timer",
		cell: ({ row }) => (
			<div className="flex items-center justify-center w-full h-full">
				<StartStopCell
					timeEntryId={row.original._id}
					activityId={row.original.activity._id}
					inProgress={!row.original.end_time}
				/>
			</div>
		),
	},
	{
		id: "actions",
		cell: ({ row }) => <ActionsCell timeEntryId={row.original._id} />,
	},
];

const CustomRow = React.forwardRef<
	HTMLTableRowElement,
	{
		row: Row<TimeEntry>;
		className?: string;
		style?: React.CSSProperties;
		virtualRowIndex: number;
	}
>(({ row, className, style, virtualRowIndex }, ref) => {
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
					className={cn("flex justify-start items-center overflow-hidden")}
				>
					{flexRender(cell.column.columnDef.cell, cell.getContext())}
				</TableCell>
			))}
		</TableRow>
	);
});

export default function TimeEntriesTable({
	data: initialData,
	onLoadMore,
	isLoading: _isLoading,
	status,
}: {
	data: TimeEntry[];
	onLoadMore: (numItems: number) => void;
	isLoading: boolean;
	status: "LoadingFirstPage" | "CanLoadMore" | "LoadingMore" | "Exhausted";
}) {
	const scrollAreaRef = React.useRef<HTMLDivElement>(null);
	const loaderRef = React.useRef<HTMLTableDataCellElement>(null);
	const [rowSelection, setRowSelection] = React.useState({});
	const [columnVisibility, setColumnVisibility] =
		React.useState<VisibilityState>({});
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
		[],
	);
	const [sorting, setSorting] = React.useState<SortingState>([]);

	React.useEffect(() => {
		if (
			status !== "CanLoadMore" ||
			!loaderRef.current ||
			!scrollAreaRef.current
		)
			return;

		if (!scrollAreaRef.current) return;

		const observer = new IntersectionObserver(
			(entries) => {
				const [entry] = entries;
				if (entry.isIntersecting) {
					onLoadMore(5);
				}
			},
			{
				root: scrollAreaRef.current,
				threshold: 0.1,
			},
		);

		observer.observe(loaderRef.current);

		return () => observer.disconnect();
	}, [status, onLoadMore]);

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
		if (!!table.getRowModel().rows.length) {
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
	const gridTemplateColumns = React.useMemo(() => {
		if (!headerGroups.length)
			return undefined as React.CSSProperties["gridTemplateColumns"];
		const headers = headerGroups[0].headers;
		const parts = headers.map((h) => {
			const colId = (h.column.columnDef.id ?? h.column.id) as string;
			switch (colId) {
				case "select":
					return "40px";
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
			typeof window !== "undefined" &&
			navigator.userAgent.indexOf("Firefox") === -1
				? (element) => element?.getBoundingClientRect().height
				: undefined,
		overscan: 5,
	});

	return (
		<div className="w-full flex-col justify-start gap-6">
			<div className="flex items-center justify-between px-4 lg:px-6">
				<div className="flex items-center gap-2">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="outline" size="sm">
								<IconLayoutColumns />
								<span className="hidden lg:inline">Customize Columns</span>
								<span className="lg:hidden">Columns</span>
								<IconChevronDown />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-56">
							{table
								.getAllColumns()
								.filter(
									(column) =>
										typeof column.accessorFn !== "undefined" &&
										column.getCanHide(),
								)
								.map((column) => {
									return (
										<DropdownMenuCheckboxItem
											key={column.id}
											className="capitalize"
											checked={column.getIsVisible()}
											onCheckedChange={(value) =>
												column.toggleVisibility(!!value)
											}
										>
											{(column.columnDef.header as string) || column.id}
										</DropdownMenuCheckboxItem>
									);
								})}
						</DropdownMenuContent>
					</DropdownMenu>
					{/* <Button variant="outline" size="sm">
						<IconPlus />
						<span className="hidden lg:inline">Add Section</span>
					</Button> */}
				</div>
			</div>
			<div className="relative flex flex-col gap-4 px-4 lg:px-6 mt-2">
				<div className="rounded-lg border">
					<ScrollArea
						ref={scrollAreaRef}
						className="relative h-[calc(100vh-400px)]"
					>
						<Table className="grid">
							<TableHeader className="bg-muted sticky grid top-0 z-10">
								{table.getHeaderGroups().map((headerGroup) => (
									<TableRow
										key={headerGroup.id}
										className="w-full grid"
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
														: flexRender(
																header.column.columnDef.header,
																header.getContext(),
															)}
												</TableHead>
											);
										})}
									</TableRow>
								))}
							</TableHeader>
							<TableBody
								className="w-full grid relative"
								style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
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
											className="h-24 text-center"
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
										<TableCell
											ref={loaderRef}
											className="h-4 w-full"
											colSpan={columns.length}
										/>
									</TableRow>
								)}
								{/* {isLoading && (
									<TableRow>
										<TableCell
											colSpan={columns.length}
											className="h-4 w-full text-center"
										>
											Loading more...
										</TableCell>
									</TableRow>
								)} */}
							</TableBody>
						</Table>
					</ScrollArea>
				</div>
				<div className="flex items-center justify-between px-4">
					<div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
						{table.getFilteredSelectedRowModel().rows.length} of{" "}
						{table.getFilteredRowModel().rows.length} row(s) selected.
					</div>
				</div>
			</div>
		</div>
	);
}
