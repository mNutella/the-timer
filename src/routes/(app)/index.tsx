import { createFileRoute } from "@tanstack/react-router";

import type { Id } from "@/../convex/_generated/dataModel";
import TimeEntriesTable from "@/components/time-entries-table";
import { SectionCards } from "@/components/section-cards";
import { api } from "@/../convex/_generated/api";
import { usePaginatedQuery } from "convex-helpers/react/cache";

export const Route = createFileRoute("/(app)/")({
	component: Index,
});

function Index() {
	const { results, loadMore, isLoading, status } = usePaginatedQuery(
		api.time_entries.getAll,
		{ userId: (import.meta as any).env.VITE_USER_ID as Id<"users"> },
		{ initialNumItems: 10 },
	);

	return (
		<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
			<SectionCards />
			{/* <div className="px-4 lg:px-6">
				<ChartAreaInteractive />
			</div> */}
			<TimeEntriesTable
				data={results}
				onLoadMore={loadMore}
				isLoading={isLoading}
				status={status}
			/>
		</div>
	);
}
