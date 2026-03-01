import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { ActiveTimerWidget } from "@/components/dashboard/active-timer-widget";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { QuickStart } from "@/components/dashboard/quick-start";
import { TodaySummaryCards } from "@/components/dashboard/today-summary-cards";
import { UnbilledSummaryCard } from "@/components/dashboard/unbilled-summary-card";
import { WidgetErrorBoundary } from "@/components/dashboard/widget-error-boundary";

export const Route = createFileRoute("/(app)/")({
	component: Index,
});

function Index() {
	const [entryCount, setEntryCount] = useState<number | undefined>(undefined);

	return (
		<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
			<WidgetErrorBoundary fallbackLabel="Timer unavailable">
				<ActiveTimerWidget />
			</WidgetErrorBoundary>
			<WidgetErrorBoundary fallbackLabel="Stats unavailable">
				<TodaySummaryCards entryCount={entryCount} />
			</WidgetErrorBoundary>
			<WidgetErrorBoundary fallbackLabel="Billing unavailable">
				<UnbilledSummaryCard />
			</WidgetErrorBoundary>
			{/* Asymmetric 2-column: Quick Start (narrow) + Activity Feed (wide) */}
			<div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
				<WidgetErrorBoundary fallbackLabel="Quick Start unavailable">
					<QuickStart />
				</WidgetErrorBoundary>
				<WidgetErrorBoundary fallbackLabel="Activity unavailable">
					<ActivityFeed onEntryCountChange={setEntryCount} />
				</WidgetErrorBoundary>
			</div>
		</div>
	);
}
