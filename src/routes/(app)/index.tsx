import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ActiveTimerWidget } from "@/components/dashboard/active-timer-widget";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { QuickStart } from "@/components/dashboard/quick-start";
import { TodaySummaryCards } from "@/components/dashboard/today-summary-cards";

export const Route = createFileRoute("/(app)/")({
	component: Index,
});

function Index() {
	const [entryCount, setEntryCount] = useState<number | undefined>(undefined);

	return (
		<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
			<div className="px-4 lg:px-6">
				<ActiveTimerWidget />
			</div>
			<TodaySummaryCards entryCount={entryCount} />
			<div className="px-4 lg:px-6">
				<QuickStart />
			</div>
			<div className="px-4 lg:px-6">
				<ActivityFeed onEntryCountChange={setEntryCount} />
			</div>
		</div>
	);
}
