import { Calendar, ChevronDown, ChevronUp, Clock, TrendingUp } from "lucide-react";
import type { AnalyticsChartData } from "@/hooks/use-analytics-chart-data";

interface AnalyticsSummaryStripProps {
	data: AnalyticsChartData;
	expanded: boolean;
	onToggle: () => void;
}

export function AnalyticsSummaryStrip({
	data,
	expanded,
	onToggle,
}: AnalyticsSummaryStripProps) {
	const { totalHours, avgDailyHours, busiestDay } = data;

	const busiestLabel = busiestDay
		? new Date(busiestDay.date).toLocaleDateString("en-US", {
				weekday: "short",
				month: "short",
				day: "numeric",
			})
		: "--";

	const ChevronIcon = expanded ? ChevronUp : ChevronDown;

	return (
		<div className="rounded-xl border border-border bg-card px-4 lg:px-6">
			<div className="flex items-center">
				<div className="flex-1 grid grid-cols-1 divide-y divide-border @xl/main:grid-cols-[1.4fr_1fr_1fr] @xl/main:divide-y-0 @xl/main:divide-x">
					{/* Featured: Total Hours */}
					<div className="flex items-center gap-4 py-4 pr-6">
						<div className="flex size-11 items-center justify-center rounded-xl bg-emerald-500/10">
							<Clock className="size-5 text-emerald-400" />
						</div>
						<div>
							<p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
								Total Hours
							</p>
							<p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
								{totalHours > 0 ? `${totalHours.toFixed(1)}h` : "--"}
							</p>
						</div>
					</div>

					{/* Avg Daily */}
					<div className="flex items-center gap-3 py-4 @xl/main:pl-6">
						<div className="flex size-8 items-center justify-center rounded-lg bg-muted">
							<TrendingUp className="size-4 text-muted-foreground" />
						</div>
						<div>
							<p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
								Avg Daily
							</p>
							<p className="mt-0.5 text-xl font-semibold tabular-nums">
								{avgDailyHours > 0 ? `${avgDailyHours.toFixed(1)}h` : "--"}
							</p>
						</div>
					</div>

					{/* Busiest Day */}
					<div className="flex items-center gap-3 py-4 @xl/main:pl-6">
						<div className="flex size-8 items-center justify-center rounded-lg bg-muted">
							<Calendar className="size-4 text-muted-foreground" />
						</div>
						<div>
							<p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
								Busiest Day
							</p>
							<p className="mt-0.5 text-xl font-semibold tabular-nums">
								{busiestLabel}
							</p>
						</div>
					</div>
				</div>

				<button
					type="button"
					onClick={onToggle}
					className="ml-2 flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
					aria-label={expanded ? "Collapse charts" : "Expand charts"}
				>
					<ChevronIcon className="size-4" />
				</button>
			</div>
		</div>
	);
}
