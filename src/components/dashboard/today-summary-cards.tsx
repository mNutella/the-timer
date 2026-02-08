import { useQuery } from "convex-helpers/react/cache";
import { useMemo } from "react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { getEndOfDay, getStartOfDay } from "@/../convex/utils";
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { formatDuration } from "@/lib/utils";

const userId = import.meta.env.VITE_USER_ID as Id<"users">;

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
		userId,
		filters: { dateRange: todayRange },
	});

	const count = entryCount ?? 0;
	const avg =
		totalDuration !== undefined && count > 0
			? Math.round(totalDuration / count)
			: 0;

	return (
		<div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-3">
			<Card className="@container/card">
				<CardHeader>
					<CardDescription>Total Time Today</CardDescription>
					<CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
						{totalDuration !== undefined
							? formatDuration(totalDuration)
							: "--:--:--"}
					</CardTitle>
				</CardHeader>
			</Card>
			<Card className="@container/card">
				<CardHeader>
					<CardDescription>Entries Today</CardDescription>
					<CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
						{entryCount !== undefined ? count : "--"}
					</CardTitle>
				</CardHeader>
			</Card>
			<Card className="@container/card">
				<CardHeader>
					<CardDescription>Average Duration</CardDescription>
					<CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
						{totalDuration !== undefined && entryCount !== undefined
							? formatDuration(avg)
							: "--:--:--"}
					</CardTitle>
				</CardHeader>
			</Card>
		</div>
	);
}
