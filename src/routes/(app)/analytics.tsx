import { createFileRoute } from "@tanstack/react-router";

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
import { useFilters } from "@/hooks/use-filters";

export const Route = createFileRoute("/(app)/analytics")({
	component: Analytics,
});

function Analytics() {
	const {
		searchValue,
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

	return (
		<div className="flex flex-col h-[calc(100dvh-var(--header-height)-1rem)] overflow-hidden">
			<div className="shrink-0 px-4 lg:px-6 pt-3 pb-2">
				<div className="flex items-center justify-start gap-2">
					<TimerEntrySearch value={searchValue} onChange={setSearchValue} />
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
					<TimeRangeFilter
						value={filterByTimeRange}
						onChange={setFilterByTimeRange}
					/>
				</div>
				<div className="grid grid-cols-4 gap-3 mt-3">
					<div className="col-span-3">
						<TimeEntriesChartBarInteractive
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
			<div className="flex flex-col flex-1 min-h-0">
				<TimeEntriesTable
					searchValue={searchValue}
					filterByClients={filterByClients}
					filterByProjects={filterByProjects}
					filterByCategories={filterByCategories}
					filterByTimeRange={filterByTimeRange}
				/>
			</div>
		</div>
	);
}
