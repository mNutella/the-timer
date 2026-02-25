import { useQuery } from "convex-helpers/react/cache";
import { Clock, Hash, TrendingUp } from "lucide-react";
import { useMemo } from "react";
import { api } from "@/../convex/_generated/api";
import { getEndOfDay, getStartOfDay } from "@/../convex/utils";
import { formatDuration } from "@/lib/utils";

export function TodaySummaryCards({
	entryCount,
}: {
	entryCount: number | undefined;
}) {
	const todayRange = useMemo(() => {
		const now = Date.now();
		return { startDate: getStartOfDay(now), endDate: getEndOfDay(now) };
	}, []);

	const totalDuration = useQuery(api.time_entries.getTotalDuration, {
		filters: { dateRange: todayRange },
	});

	const count = entryCount ?? 0;
	const avg =
		totalDuration !== undefined && count > 0
			? Math.round(totalDuration / count)
			: 0;

	return (
		<div className="rounded-xl border border-border bg-card px-4 lg:px-6">
			<div className="grid grid-cols-1 divide-y divide-border @xl/main:grid-cols-[1.4fr_1fr_1fr] @xl/main:divide-y-0 @xl/main:divide-x">
				{/* Featured: Total Time — larger treatment */}
				<div className="flex items-center gap-4 py-5 pr-6">
					<div className="flex size-11 items-center justify-center rounded-xl bg-success/10">
						<Clock className="size-5 text-success" />
					</div>
					<div>
						<p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
							Total Time Today
						</p>
						<p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight">
							{totalDuration !== undefined
								? formatDuration(totalDuration)
								: "--:--:--"}
						</p>
					</div>
				</div>

				{/* Entries — compact */}
				<div className="flex items-center gap-3 py-5 @xl/main:pl-6">
					<div className="flex size-8 items-center justify-center rounded-lg bg-muted">
						<Hash className="size-4 text-muted-foreground" />
					</div>
					<div>
						<p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
							Entries
						</p>
						<p className="mt-0.5 text-xl font-semibold tabular-nums">
							{entryCount !== undefined ? String(count) : "--"}
						</p>
					</div>
				</div>

				{/* Average — compact */}
				<div className="flex items-center gap-3 py-5 @xl/main:pl-6">
					<div className="flex size-8 items-center justify-center rounded-lg bg-muted">
						<TrendingUp className="size-4 text-muted-foreground" />
					</div>
					<div>
						<p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
							Avg Duration
						</p>
						<p className="mt-0.5 text-xl font-semibold tabular-nums">
							{totalDuration !== undefined && entryCount !== undefined
								? formatDuration(avg)
								: "--:--:--"}
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
