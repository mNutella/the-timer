import { useConvex } from "convex/react";
import { Download, FileSpreadsheet, Loader2 } from "lucide-react";
import * as React from "react";
import type { DateRange } from "react-day-picker";
import { toast } from "sonner";
import { api } from "@/../convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
	type ExportFormat,
	type ExportGroupBy,
	type ExportMode,
	exportEntries,
} from "@/lib/export";
import type { Category, Client, Project } from "@/lib/types";

interface ExportDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	searchValue: string;
	filterByClients: Client[];
	filterByProjects: Project[];
	filterByCategories: Category[];
	filterByTimeRange?: DateRange;
}

function formatDateLabel(date: Date): string {
	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

export function ExportDialog({
	open,
	onOpenChange,
	searchValue,
	filterByClients,
	filterByProjects,
	filterByCategories,
	filterByTimeRange,
}: ExportDialogProps) {
	const convex = useConvex();
	const [format, setFormat] = React.useState<ExportFormat>("csv");
	const [mode, setMode] = React.useState<ExportMode>("detailed");
	const [groupBy, setGroupBy] = React.useState<ExportGroupBy>("none");
	const [exporting, setExporting] = React.useState(false);

	// Default to last 3 months when no date range filter is active
	const effectiveDateRange = React.useMemo(() => {
		if (filterByTimeRange?.from) {
			return {
				startDate: filterByTimeRange.from.getTime(),
				endDate: filterByTimeRange.to?.getTime(),
			};
		}
		const now = new Date();
		const threeMonthsAgo = new Date(now);
		threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
		return {
			startDate: threeMonthsAgo.getTime(),
			endDate: now.getTime(),
		};
	}, [filterByTimeRange]);

	const hasEntityFilters =
		searchValue.trim().length > 0 ||
		filterByClients.length > 0 ||
		filterByProjects.length > 0 ||
		filterByCategories.length > 0;

	const hasCustomDateRange = filterByTimeRange?.from !== undefined;

	const handleExport = async () => {
		setExporting(true);
		try {
			const trimmedSearch = searchValue.trim();

			const filters = {
				...(trimmedSearch && { name: trimmedSearch }),
				...(filterByClients.length > 0 && {
					clientIds: filterByClients.map((c) => c._id),
				}),
				...(filterByProjects.length > 0 && {
					projectIds: filterByProjects.map((p) => p._id),
				}),
				...(filterByCategories.length > 0 && {
					categoryIds: filterByCategories.map((c) => c._id),
				}),
				dateRange: effectiveDateRange,
			};

			const entries = await convex.query(api.time_entries.exportTimeEntries, {
				filters,
			});

			if (entries.length === 0) {
				toast.warning("No entries to export", {
					description: "Try adjusting your filters or date range.",
				});
				return;
			}

			const saved = await exportEntries(entries, { format, mode, groupBy });
			if (saved) {
				toast.success(`Exported ${entries.length} entries`);
				onOpenChange(false);
			}
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: typeof error === "string"
						? error
						: "An unexpected error occurred";
			console.error("Export failed:", error);
			toast.error("Export failed", { description: message });
		} finally {
			setExporting(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<FileSpreadsheet className="size-5" />
						Export Time Entries
					</DialogTitle>
					<DialogDescription>
						Configure your export settings and download.
					</DialogDescription>
				</DialogHeader>

				<div className="grid gap-4 py-2">
					<div className="space-y-2">
						<span className="text-sm font-medium">Format</span>
						<ToggleGroup
							type="single"
							variant="outline"
							value={format}
							onValueChange={(v) => {
								if (v) setFormat(v as ExportFormat);
							}}
							className="w-full"
						>
							<ToggleGroupItem value="csv" className="flex-1">
								CSV
							</ToggleGroupItem>
							<ToggleGroupItem value="json" className="flex-1">
								JSON
							</ToggleGroupItem>
						</ToggleGroup>
					</div>

					<div className="space-y-2">
						<span className="text-sm font-medium">Mode</span>
						<ToggleGroup
							type="single"
							variant="outline"
							value={mode}
							onValueChange={(v) => {
								if (v) setMode(v as ExportMode);
							}}
							className="w-full"
						>
							<ToggleGroupItem value="detailed" className="flex-1">
								Detailed
							</ToggleGroupItem>
							<ToggleGroupItem value="merged" className="flex-1">
								Merged
							</ToggleGroupItem>
							<ToggleGroupItem value="summary" className="flex-1">
								Summary
							</ToggleGroupItem>
						</ToggleGroup>
					</div>

					<div className="space-y-2">
						<span className="text-sm font-medium">Group By</span>
						<Select
							value={groupBy}
							onValueChange={(v) => setGroupBy(v as ExportGroupBy)}
						>
							<SelectTrigger className="w-full">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="none">None</SelectItem>
								<SelectItem value="client">Client</SelectItem>
								<SelectItem value="project">Project</SelectItem>
								<SelectItem value="category">Category</SelectItem>
								<SelectItem value="date">Date</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2">
						<span className="text-sm font-medium text-muted-foreground">
							{hasEntityFilters || hasCustomDateRange
								? "Active Filters"
								: "Date Range"}
						</span>
						<div className="flex flex-wrap gap-1.5">
							{searchValue.trim() && (
								<Badge variant="secondary">Search: {searchValue.trim()}</Badge>
							)}
							{[
								...filterByClients,
								...filterByProjects,
								...filterByCategories,
							].map((entity) => (
								<Badge key={entity._id} variant="secondary">
									{entity.name}
								</Badge>
							))}
							<Badge variant={hasCustomDateRange ? "secondary" : "outline"}>
								{formatDateLabel(new Date(effectiveDateRange.startDate))}
								{effectiveDateRange.endDate &&
									` – ${formatDateLabel(new Date(effectiveDateRange.endDate))}`}
								{!hasCustomDateRange && " (default)"}
							</Badge>
						</div>
					</div>
				</div>

				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={exporting}
					>
						Cancel
					</Button>
					<Button onClick={handleExport} disabled={exporting}>
						{exporting ? (
							<Loader2 className="size-4 animate-spin" />
						) : (
							<Download className="size-4" />
						)}
						{exporting ? "Exporting..." : "Export"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
