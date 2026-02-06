import { createFileRoute } from "@tanstack/react-router";

import { TimeEntriesChartBarInteractive } from "@/components/time-entries-chart-bar";
import { TimerEntrySearch } from "@/components/time-entries-table/timer-entry-search";
import {
	CategoryFilter,
	ClientFilter,
	ProjectFilter,
	TimeRangeFilter,
} from "@/components/time-entry-filters";
import { TimeEntriesChartRadialStacked } from "@/components/timer-entries-chart-radial-stacked";
import { useFilters } from "@/hooks/use-filters";

export const Route = createFileRoute("/(app)/analytics")({
	component: Analytics,
});

function Analytics() {
	const {
		searchValue,
		setSearchValue,
		filterByClient,
		setFilterByClient,
		filterByProject,
		setFilterByProject,
		filterByCategory,
		setFilterByCategory,
		filterByTimeRange,
		setFilterByTimeRange,
	} = useFilters();

	return (
		<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
			<div className="px-4 lg:px-6">
				<div className="flex items-center justify-start gap-2">
					<TimerEntrySearch value={searchValue} onChange={setSearchValue} />
					<ClientFilter
						value={filterByClient}
						onSelect={setFilterByClient}
						placeholder="Filter by Client"
					/>
					<ProjectFilter
						value={filterByProject}
						onSelect={setFilterByProject}
						placeholder="Filter by Project"
					/>
					<CategoryFilter
						value={filterByCategory ?? undefined}
						onSelect={setFilterByCategory}
						placeholder="Filter by Category"
					/>
					<TimeRangeFilter
						value={filterByTimeRange}
						onChange={setFilterByTimeRange}
					/>
				</div>
				<div className="grid grid-cols-4 gap-4 mt-4">
					<div className="col-span-3 gap-y-4 flex flex-col">
						<TimeEntriesChartBarInteractive
							clientFilter={filterByClient}
							projectFilter={filterByProject}
							categoryFilter={filterByCategory}
							dateRange={filterByTimeRange}
						/>
					</div>
					<div className="col-span-1">
						<TimeEntriesChartRadialStacked
							clientFilter={filterByClient}
							projectFilter={filterByProject}
							categoryFilter={filterByCategory}
							dateRange={filterByTimeRange}
						/>
					</div>
					{/* <ChartAreaInteractive /> */}
				</div>
			</div>
		</div>
	);
}
