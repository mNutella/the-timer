import { useQuery } from "convex/react";
import {
	startOfWeek,
	endOfWeek,
	addWeeks,
	subWeeks,
	isSameDay,
	addDays,
	startOfDay,
	endOfDay,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DateRange } from "react-day-picker";

import { api } from "@/../convex/_generated/api";
import { Button } from "@/components/ui/button";
import type { Category, Client, Project } from "@/lib/types";

import DayColumn from "./day-column";
import {
	buildColorMap,
	groupEntriesByDay,
	positionEntries,
	HOUR_HEIGHT,
	DAY_END_HOUR,
	DAY_START_HOUR,
} from "./layout";

const TOTAL_HOURS = DAY_END_HOUR - DAY_START_HOUR;
const GUTTER_WIDTH = 56;

interface TimelineViewProps {
	searchValue: string;
	filterByClients: Client[];
	filterByProjects: Project[];
	filterByCategories: Category[];
	filterByTimeRange?: DateRange;
}

function getWeekStart(date: Date): Date {
	return startOfWeek(date, { weekStartsOn: 1 });
}

function getWeekEnd(date: Date): Date {
	return endOfWeek(date, { weekStartsOn: 1 });
}

function formatWeekLabel(weekStart: Date, weekEnd: Date): string {
	const startMonth = weekStart.toLocaleDateString("en-US", { month: "short" });
	const endMonth = weekEnd.toLocaleDateString("en-US", { month: "short" });
	const startDay = weekStart.getDate();
	const endDay = weekEnd.getDate();
	const endYear = weekEnd.getFullYear();

	if (startMonth === endMonth) {
		return `${startMonth} ${startDay} – ${endDay}, ${endYear}`;
	}
	return `${startMonth} ${startDay} – ${endMonth} ${endDay}, ${endYear}`;
}

export default function TimelineView({
	searchValue,
	filterByClients,
	filterByProjects,
	filterByCategories,
	filterByTimeRange,
}: TimelineViewProps) {
	const [weekStart, setWeekStart] = useState(() => {
		const from = filterByTimeRange?.from;
		return getWeekStart(from ?? new Date());
	});

	const weekEnd = getWeekEnd(weekStart);
	const today = new Date();

	// Tick for running timers & current-time indicator
	const [now, setNow] = useState(Date.now());
	useEffect(() => {
		const id = setInterval(() => setNow(Date.now()), 60_000);
		return () => clearInterval(id);
	}, []);

	// Build 7 day dates
	const days = useMemo(
		() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
		[weekStart],
	);

	// Fetch entries for the week
	const entries = useQuery(api.time_entries.exportTimeEntries, {
		filters: {
			name: searchValue || undefined,
			clientIds: filterByClients.length ? filterByClients.map((c) => c._id) : undefined,
			projectIds: filterByProjects.length ? filterByProjects.map((p) => p._id) : undefined,
			categoryIds: filterByCategories.length ? filterByCategories.map((c) => c._id) : undefined,
			dateRange: {
				startDate: weekStart.getTime(),
				endDate: weekEnd.getTime(),
			},
		},
	});

	// Color assignment
	const { dimension, colorMap } = useMemo(
		() => buildColorMap(filterByClients, filterByProjects, filterByCategories),
		[filterByClients, filterByProjects, filterByCategories],
	);

	// Group entries by day
	const entriesByDay = useMemo(() => groupEntriesByDay(entries ?? []), [entries]);

	// Position entries per day
	const positionedByDay = useMemo(() => {
		const map = new Map<string, ReturnType<typeof positionEntries>>();
		for (const day of days) {
			const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
			const dayEntries = entriesByDay.get(key) ?? [];
			const dayStartMs = startOfDay(day).getTime();
			const dayEndMs = endOfDay(day).getTime();
			map.set(key, positionEntries(dayEntries, dayStartMs, dayEndMs, dimension, colorMap, now));
		}
		return map;
	}, [days, entriesByDay, dimension, colorMap, now]);

	// Navigation
	const goToPrevWeek = useCallback(() => setWeekStart((w) => subWeeks(w, 1)), []);
	const goToNextWeek = useCallback(() => setWeekStart((w) => addWeeks(w, 1)), []);
	const goToToday = useCallback(() => setWeekStart(getWeekStart(new Date())), []);

	// Auto-scroll to current hour on mount
	const scrollRef = useRef<HTMLDivElement>(null);
	const hasScrolled = useRef(false);
	useEffect(() => {
		if (hasScrolled.current || !scrollRef.current) return;
		hasScrolled.current = true;

		// Find earliest entry or use current hour
		let scrollToHour = new Date().getHours();
		if (entries && entries.length > 0) {
			const earliest = entries.reduce((min, e) =>
				(e.start_time ?? Infinity) < (min.start_time ?? Infinity) ? e : min,
			);
			if (earliest.start_time) {
				scrollToHour = new Date(earliest.start_time).getHours();
			}
		}

		const scrollTop = Math.max(0, (scrollToHour - 1) * HOUR_HEIGHT);
		scrollRef.current.scrollTop = scrollTop;
	}, [entries]);

	const isCurrentWeek = isSameDay(weekStart, getWeekStart(today));

	return (
		<div className="flex min-h-0 flex-1 flex-col pb-2">
			{/* Week navigation */}
			<div className="flex items-center gap-2 py-2">
				<Button variant="outline" size="sm" onClick={goToToday} disabled={isCurrentWeek}>
					Today
				</Button>
				<Button variant="ghost" size="icon" className="size-7" onClick={goToPrevWeek}>
					<ChevronLeft className="size-4" />
				</Button>
				<Button variant="ghost" size="icon" className="size-7" onClick={goToNextWeek}>
					<ChevronRight className="size-4" />
				</Button>
				<span className="text-sm font-medium">{formatWeekLabel(weekStart, weekEnd)}</span>
			</div>

			{/* Grid */}
			<div className="min-h-0 flex-1 overflow-hidden rounded-lg border">
				<div ref={scrollRef} className="h-full overflow-x-auto overflow-y-auto">
					<div
						className="grid min-w-[900px]"
						style={{
							gridTemplateColumns: `${GUTTER_WIDTH}px repeat(7, 1fr)`,
						}}
					>
						{/* Header row: gutter + day headers */}
						<div className="sticky top-0 z-20 border-r border-b bg-background" />
						{days.map((day) => {
							const isToday_ = isSameDay(day, today);
							const dayLabel = day.toLocaleDateString("en-US", {
								weekday: "short",
							});
							return (
								<div
									key={day.toISOString()}
									className={`sticky top-0 z-20 flex flex-col items-center border-r border-b bg-background py-1.5 text-xs ${isToday_ ? "bg-primary/5" : ""}`}
								>
									<span
										className={`text-[10px] font-medium uppercase ${isToday_ ? "text-primary" : "text-muted-foreground"}`}
									>
										{dayLabel}
									</span>
									<span
										className={`text-sm leading-tight font-semibold ${isToday_ ? "text-primary" : ""}`}
									>
										{day.getDate()}
									</span>
								</div>
							);
						})}

						{/* Body row: hour gutter + day columns */}
						<div className="relative border-r" style={{ height: `${TOTAL_HOURS * HOUR_HEIGHT}px` }}>
							{Array.from({ length: TOTAL_HOURS }, (_, i) => (
								<div
									key={i}
									className="absolute right-0 left-0 flex items-start justify-end pr-2 text-[10px] text-muted-foreground"
									style={{ top: `${i * HOUR_HEIGHT}px` }}
								>
									<span className="-translate-y-1/2">{formatHourLabel(DAY_START_HOUR + i)}</span>
								</div>
							))}
						</div>
						{days.map((day) => {
							const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
							const positioned = positionedByDay.get(key) ?? [];
							return (
								<DayColumn
									key={key}
									isToday={isSameDay(day, today)}
									positioned={positioned}
									now={now}
								/>
							);
						})}
					</div>
				</div>
			</div>

			{/* Empty state */}
			{entries && entries.length === 0 && (
				<div className="pointer-events-none absolute inset-0 flex items-center justify-center">
					<p className="text-sm text-muted-foreground">No time entries this week</p>
				</div>
			)}
		</div>
	);
}

function formatHourLabel(hour: number): string {
	if (hour === 0) return "12 AM";
	if (hour === 12) return "12 PM";
	if (hour < 12) return `${hour} AM`;
	return `${hour - 12} PM`;
}
