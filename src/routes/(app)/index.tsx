import { createFileRoute } from "@tanstack/react-router";
import { SectionCards } from "@/components/section-cards";
import TimeEntriesTable from "@/components/time-entries-table";

export const Route = createFileRoute("/(app)/")({
	component: Index,
});

function Index() {
	return (
		<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
			<SectionCards />
			<TimeEntriesTable />
		</div>
	);
}
