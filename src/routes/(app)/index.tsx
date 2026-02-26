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
			<div className="px-4 lg:px-6">
				<WidgetErrorBoundary fallbackLabel="Timer unavailable">
					<ActiveTimerWidget />
				</WidgetErrorBoundary>
			</div>
			<div className="px-4 lg:px-6">
				<WidgetErrorBoundary fallbackLabel="Stats unavailable">
					<TodaySummaryCards entryCount={entryCount} />
				</WidgetErrorBoundary>
			</div>
			<div className="px-4 lg:px-6">
				<WidgetErrorBoundary fallbackLabel="Billing unavailable">
					<UnbilledSummaryCard />
				</WidgetErrorBoundary>
			</div>
			{/* Asymmetric 2-column: Quick Start (narrow) + Activity Feed (wide) */}
			<div className="grid grid-cols-1 gap-4 px-4 md:gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:px-6">
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
