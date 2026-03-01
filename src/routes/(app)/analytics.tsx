import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, Table2 } from "lucide-react";
import { Suspense, lazy, useCallback, useState } from "react";

import { AnalyticsSummaryStrip } from "@/components/analytics-summary-strip";
import TimeEntriesTable from "@/components/time-entries-table";
import {
	CategoryFilter,
	ClientFilter,
	ProjectFilter,
	TimeRangeFilter,
	TimerEntrySearch,
} from "@/components/time-entry-filters";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAnalyticsChartData } from "@/hooks/use-analytics-chart-data";
import { useFilters } from "@/hooks/use-filters";

const TimeEntriesChartBarInteractive = lazy(() =>
	import("@/components/time-entries-chart-bar").then((m) => ({
		default: m.TimeEntriesChartBarInteractive,
	})),
);
const TimeEntriesChartRadialStacked = lazy(() =>
	import("@/components/timer-entries-chart-radial-stacked").then((m) => ({
		default: m.TimeEntriesChartRadialStacked,
	})),
);
const TimelineView = lazy(() => import("@/components/timeline-view"));

const CHARTS_EXPANDED_KEY = "analytics-charts-expanded";

export const Route = createFileRoute("/(app)/analytics")({
	component: Analytics,
});

function Analytics() {
	const {
		searchValue,
		debouncedSearchValue,
		setSearchValue,
		filterByClients,
		setFilterByClients,
		filterByProjects,
		setFilterByProjects,
		filterByCategories,
		setFilterByCategories,
		filterByTimeRange,
		setFilterByTimeRange,
	} = useFilters();

	const [chartsExpanded, setChartsExpanded] = useState(() => {
		const stored = localStorage.getItem(CHARTS_EXPANDED_KEY);
		return stored === null ? true : stored === "true";
	});

	const toggleCharts = useCallback(() => {
		setChartsExpanded((prev) => {
			const next = !prev;
			localStorage.setItem(CHARTS_EXPANDED_KEY, String(next));
			return next;
		});
	}, []);

	const chartData = useAnalyticsChartData(
		filterByClients,
		filterByProjects,
		filterByCategories,
		filterByTimeRange,
	);

	return (
		<div className="flex h-dvh flex-col overflow-hidden">
			<div className="shrink-0 pt-3 pb-2">
				<div className="flex items-center justify-start gap-2">
					<TimerEntrySearch value={searchValue} onChange={setSearchValue} />
					<Separator orientation="vertical" className="mx-1 h-5" />
					<div className="flex items-center gap-1.5">
						<ClientFilter
							value={filterByClients}
							onSelect={setFilterByClients}
							placeholder="Filter by Client"
						/>
						<ProjectFilter
							value={filterByProjects}
							onSelect={setFilterByProjects}
							placeholder="Filter by Project"
						/>
						<CategoryFilter
							value={filterByCategories}
							onSelect={setFilterByCategories}
							placeholder="Filter by Category"
						/>
					</div>
					<Separator orientation="vertical" className="mx-1 h-5" />
					<div className="ml-auto">
						<TimeRangeFilter value={filterByTimeRange} onChange={setFilterByTimeRange} />
					</div>
				</div>
				<div
					className="grid transition-[grid-template-rows] duration-300 ease-in-out"
					style={{ gridTemplateRows: chartsExpanded ? "1fr" : "0fr" }}
				>
					<div className="min-h-0 overflow-hidden">
						<Suspense fallback={null}>
							<div className="mt-4 grid grid-cols-4 gap-4">
								<div className="col-span-3">
									<TimeEntriesChartBarInteractive
										chartData={chartData.chartData}
										chartConfig={chartData.chartConfig}
										entityKeys={chartData.entityKeys}
										totalHours={chartData.totalHours}
										clientFilter={filterByClients}
										projectFilter={filterByProjects}
										categoryFilter={filterByCategories}
										dateRange={filterByTimeRange}
									/>
								</div>
								<div className="col-span-1">
									<TimeEntriesChartRadialStacked
										clientFilter={filterByClients}
										projectFilter={filterByProjects}
										categoryFilter={filterByCategories}
										dateRange={filterByTimeRange}
									/>
								</div>
							</div>
						</Suspense>
					</div>
				</div>
				<div className="mt-4">
					<AnalyticsSummaryStrip
						data={chartData}
						expanded={chartsExpanded}
						onToggle={toggleCharts}
					/>
				</div>
			</div>
			<Tabs defaultValue="table" className="flex min-h-0 flex-1 flex-col">
				<div>
					<TabsList>
						<TabsTrigger value="table">
							<Table2 className="size-3.5" />
							Table
						</TabsTrigger>
						<TabsTrigger value="timeline">
							<CalendarDays className="size-3.5" />
							Timeline
						</TabsTrigger>
					</TabsList>
				</div>
				<TabsContent value="table" className="flex min-h-0 flex-1 flex-col">
					<TimeEntriesTable
						searchValue={debouncedSearchValue}
						filterByClients={filterByClients}
						filterByProjects={filterByProjects}
						filterByCategories={filterByCategories}
						filterByTimeRange={filterByTimeRange}
					/>
				</TabsContent>
				<TabsContent value="timeline" className="flex min-h-0 flex-1 flex-col">
					<Suspense fallback={null}>
						<TimelineView
							searchValue={debouncedSearchValue}
							filterByClients={filterByClients}
							filterByProjects={filterByProjects}
							filterByCategories={filterByCategories}
							filterByTimeRange={filterByTimeRange}
						/>
					</Suspense>
				</TabsContent>
			</Tabs>
		</div>
	);
}
