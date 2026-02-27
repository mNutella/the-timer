import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import EntryEditPopover from "./entry-edit-popover";
import type { PositionedEntry } from "./layout";
import { DAY_END_HOUR, DAY_START_HOUR, HOUR_HEIGHT } from "./layout";
import TimelineBlock from "./timeline-block";

const TOTAL_HOURS = DAY_END_HOUR - DAY_START_HOUR;

interface DayColumnProps {
	isToday: boolean;
	positioned: PositionedEntry[];
	now: number;
}

export default function DayColumn({
	isToday,
	positioned,
	now,
}: DayColumnProps) {
	const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
	const blockRefs = useRef<Map<string, HTMLDivElement>>(new Map());

	const selectedPositioned = positioned.find(
		(p) => p.entry._id === selectedEntryId,
	);

	const handleBlockClick = useCallback((entryId: string) => {
		setSelectedEntryId((prev) => (prev === entryId ? null : entryId));
	}, []);

	const setBlockRef = useCallback(
		(id: string) => (el: HTMLDivElement | null) => {
			if (el) blockRefs.current.set(id, el);
			else blockRefs.current.delete(id);
		},
		[],
	);

	// Current time indicator position
	const nowDate = new Date(now);
	const currentHourOffset =
		nowDate.getHours() +
		nowDate.getMinutes() / 60 +
		nowDate.getSeconds() / 3600;
	const nowTop = currentHourOffset * HOUR_HEIGHT;

	return (
		<div
			className={cn(
				"relative border-r min-w-0",
				isToday && "bg-primary/[0.02]",
			)}
			style={{ height: `${TOTAL_HOURS * HOUR_HEIGHT}px` }}
		>
			{/* Hour grid lines */}
			{Array.from({ length: TOTAL_HOURS }, (_, i) => (
				<div
					key={i}
					className="absolute left-0 right-0 border-t border-border/40"
					style={{ top: `${i * HOUR_HEIGHT}px` }}
				/>
			))}

			{/* Half-hour lines */}
			{Array.from({ length: TOTAL_HOURS }, (_, i) => (
				<div
					key={`half-${i}`}
					className="absolute left-0 right-0 border-t border-border/20 border-dashed"
					style={{ top: `${(i + 0.5) * HOUR_HEIGHT}px` }}
				/>
			))}

			{/* Time entry blocks */}
			{positioned.map((p) => (
				<TimelineBlock
					key={p.entry._id}
					ref={setBlockRef(p.entry._id)}
					positioned={p}
					isRunning={!p.entry.end_time}
					onClick={() => handleBlockClick(p.entry._id)}
					isSelected={selectedEntryId === p.entry._id}
				/>
			))}

			{/* Current time indicator */}
			{isToday && (
				<div
					className="absolute left-0 right-0 z-30 pointer-events-none"
					style={{ top: `${nowTop}px` }}
				>
					<div className="relative flex items-center">
						<div className="absolute -left-1 size-2 rounded-full bg-red-500" />
						<div className="w-full h-px bg-red-500" />
					</div>
				</div>
			)}

			{/* Edit popover */}
			{selectedPositioned && blockRefs.current.get(selectedEntryId!) && (
				<EntryEditPopover
					entry={selectedPositioned.entry}
					open={true}
					onOpenChange={(open) => {
						if (!open) setSelectedEntryId(null);
					}}
					anchorRef={{
						current: blockRefs.current.get(selectedEntryId!)!,
					}}
				/>
			)}
		</div>
	);
}
