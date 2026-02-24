import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";

import { AnalyticsSummaryStrip } from "@/components/analytics-summary-strip";
import { TimeEntriesChartBarInteractive } from "@/components/time-entries-chart-bar";
import TimeEntriesTable from "@/components/time-entries-table";
import {
	CategoryFilter,
	ClientFilter,
	ProjectFilter,
	TimeRangeFilter,
	TimerEntrySearch,
} from "@/components/time-entry-filters";
import { TimeEntriesChartRadialStacked } from "@/components/timer-entries-chart-radial-stacked";
import { Separator } from "@/components/ui/separator";
import { useAnalyticsChartData } from "@/hooks/use-analytics-chart-data";
import { useFilters } from "@/hooks/use-filters";

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
		<div className="flex flex-col h-[calc(100dvh-6rem)] overflow-hidden">
			<div className="shrink-0 px-4 lg:px-6 pt-3 pb-2">
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
						<TimeRangeFilter
							value={filterByTimeRange}
							onChange={setFilterByTimeRange}
						/>
					</div>
				</div>
				<div
					className="grid transition-[grid-template-rows] duration-300 ease-in-out"
					style={{ gridTemplateRows: chartsExpanded ? "1fr" : "0fr" }}
				>
					<div className="overflow-hidden min-h-0">
						<div className="grid grid-cols-4 gap-4 mt-4">
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
			<div className="flex flex-col flex-1 min-h-0">
				<TimeEntriesTable
					searchValue={debouncedSearchValue}
					filterByClients={filterByClients}
					filterByProjects={filterByProjects}
					filterByCategories={filterByCategories}
					filterByTimeRange={filterByTimeRange}
				/>
			</div>
		</div>
	);
}
