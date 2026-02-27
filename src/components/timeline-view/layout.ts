import type { FunctionReturnType } from "convex/server";
import type { api } from "@/../convex/_generated/api";
import {
	getStackDimension,
	getEntityIds,
	type StackDimension,
} from "@/components/time-entries-chart-bar";
import type { Category, Client, Project } from "@/lib/types";
import { CHART_COLORS } from "@/lib/utils";

export type ExportedEntry = FunctionReturnType<
	typeof api.time_entries.exportTimeEntries
>[number];

export const HOUR_HEIGHT = 60; // px per hour
export const MIN_BLOCK_HEIGHT = 14; // minimum clickable height
export const MIN_BLOCK_MINUTES = 15;
export const DAY_START_HOUR = 0;
export const DAY_END_HOUR = 24;

export interface PositionedEntry {
	entry: ExportedEntry;
	top: number;
	height: number;
	left: string;
	width: string;
	color: string;
}

/** Convert a timestamp (ms) to pixel offset from the top of the day column. */
export function timeToPixel(timestamp: number, dayStart: number): number {
	const msFromDayStart = timestamp - dayStart;
	const hours = msFromDayStart / (1000 * 60 * 60);
	return hours * HOUR_HEIGHT;
}

/**
 * Assign overlapping entries to columns (greedy left-to-right).
 * Returns column index for each entry.
 */
function assignColumns(
	entries: { start: number; end: number; index: number }[],
): { columnIndex: number; totalColumns: number }[] {
	if (entries.length === 0) return [];

	// Sort by start, then by end (longer first for ties)
	const sorted = [...entries].sort(
		(a, b) => a.start - b.start || b.end - a.end,
	);

	// Each column tracks the end time of its last entry
	const columns: number[] = [];
	const result = new Map<number, number>();

	for (const entry of sorted) {
		let placed = false;
		for (let col = 0; col < columns.length; col++) {
			if (entry.start >= columns[col]) {
				columns[col] = entry.end;
				result.set(entry.index, col);
				placed = true;
				break;
			}
		}
		if (!placed) {
			result.set(entry.index, columns.length);
			columns.push(entry.end);
		}
	}

	const totalColumns = columns.length;
	return entries.map((e) => ({
		columnIndex: result.get(e.index) ?? 0,
		totalColumns,
	}));
}

/** Build a color map based on the active filter dimension. */
export function buildColorMap(
	clientFilter: Client[],
	projectFilter: Project[],
	categoryFilter: Category[],
): { dimension: StackDimension | null; colorMap: Map<string, string> } {
	const dimension = getStackDimension(
		clientFilter,
		projectFilter,
		categoryFilter,
	);
	const colorMap = new Map<string, string>();
	if (dimension) {
		const ids = getEntityIds(
			dimension,
			clientFilter,
			projectFilter,
			categoryFilter,
		);
		for (let i = 0; i < ids.length; i++) {
			colorMap.set(ids[i], CHART_COLORS[i % CHART_COLORS.length]);
		}
	}
	return { dimension, colorMap };
}

function getEntryColor(
	entry: ExportedEntry,
	dimension: StackDimension | null,
	colorMap: Map<string, string>,
): string {
	if (!dimension) return "var(--chart-1)";
	const id =
		dimension === "client"
			? entry.client?._id
			: dimension === "project"
				? entry.project?._id
				: entry.category?._id;
	return (id && colorMap.get(id)) ?? "var(--chart-1)";
}

/**
 * Position entries for a single day column.
 * dayStart = start-of-day timestamp in ms.
 */
export function positionEntries(
	entries: ExportedEntry[],
	dayStart: number,
	dayEnd: number,
	dimension: StackDimension | null,
	colorMap: Map<string, string>,
	now?: number,
): PositionedEntry[] {
	// Filter to entries with start_time
	const valid = entries.filter((e) => e.start_time != null);
	if (valid.length === 0) return [];

	// Compute raw start/end within the day
	const bounds = valid.map((entry, index) => {
		const start = Math.max(entry.start_time!, dayStart);
		const end = entry.end_time
			? Math.min(entry.end_time, dayEnd)
			: Math.min(now ?? Date.now(), dayEnd);
		return { start, end: Math.max(end, start), index };
	});

	const columnAssignments = assignColumns(bounds);

	return valid.map((entry, i) => {
		const { start, end } = bounds[i];
		const { columnIndex, totalColumns } = columnAssignments[i];

		const top = timeToPixel(start, dayStart);
		const rawHeight = timeToPixel(end, dayStart) - top;
		const height = Math.max(rawHeight, MIN_BLOCK_HEIGHT);

		const widthPct = 100 / totalColumns;
		const leftPct = columnIndex * widthPct;

		return {
			entry,
			top,
			height,
			left: `${leftPct}%`,
			width: `${widthPct}%`,
			color: getEntryColor(entry, dimension, colorMap),
		};
	});
}

/** Group entries by date key (YYYY-MM-DD). */
export function groupEntriesByDay(
	entries: ExportedEntry[],
): Map<string, ExportedEntry[]> {
	const map = new Map<string, ExportedEntry[]>();
	for (const entry of entries) {
		if (!entry.start_time) continue;
		const date = new Date(entry.start_time);
		const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
		const arr = map.get(key) ?? [];
		arr.push(entry);
		map.set(key, arr);
	}
	return map;
}
