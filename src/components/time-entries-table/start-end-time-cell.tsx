import type { Id } from "convex/_generated/dataModel";
import { useUpdateStartEndTime } from "./hooks";
import TimeEntriesStartEndCalendar from "@/components/timer-entries-start-end-calendar";

export function StartEndTimeCell({
	timeEntryId,
	startTime,
	endTime,
}: {
	timeEntryId: Id<"time_entries">;
	startTime: number;
	endTime: number;
}) {
	const updateStartEndTime = useUpdateStartEndTime(timeEntryId);
	return (
		<TimeEntriesStartEndCalendar
			startTime={startTime}
			endTime={endTime}
			onPopoverClose={(_dateRange, changed) => {
				if (changed) {
					updateStartEndTime(
						_dateRange.from?.getTime() ?? 0,
						_dateRange.to?.getTime() ?? 0,
					);
				}
			}}
		/>
	);
}
