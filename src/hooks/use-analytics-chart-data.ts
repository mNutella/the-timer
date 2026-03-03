import { useQuery } from "convex-helpers/react/cache";
import { useMemo } from "react";
import type { DateRange } from "react-day-picker";

import { api } from "@/../convex/_generated/api";
import {
	getConstraintFilters,
	getEntityIds,
	getStackDimension,
} from "@/components/time-entries-chart-bar";
import type { ChartConfig } from "@/components/ui/chart";
import type { Category, Client, Project } from "@/lib/types";
import { CHART_COLORS, getDefaultDateRange, toDateRangeTimestamps } from "@/lib/utils";

function slugify(name: string): string {
	return name.replace(/\s+/g, "_").toLowerCase();
}

export interface AnalyticsChartData {
	chartData: Record<string, unknown>[];
	chartConfig: ChartConfig;
	entityKeys: string[] | null;
	totalHours: number;
	avgDailyHours: number;
	busiestDay: { date: string; hours: number } | null;
}

export function useAnalyticsChartData(
	clientFilter: Client[],
	projectFilter: Project[],
	categoryFilter: Category[],
	dateRange?: DateRange,
): AnalyticsChartData {
	const range = useMemo(
		() => toDateRangeTimestamps(dateRange) ?? getDefaultDateRange(),
		[dateRange],
	);

	const stackDimension = useMemo(
		() => getStackDimension(clientFilter, projectFilter, categoryFilter),
		[clientFilter, projectFilter, categoryFilter],
	);

	const entityIds = useMemo(
		() =>
			stackDimension
				? getEntityIds(stackDimension, clientFilter, projectFilter, categoryFilter)
				: [],
		[stackDimension, clientFilter, projectFilter, categoryFilter],
	);

	const constraintFilters = useMemo(
		() =>
			stackDimension
				? getConstraintFilters(stackDimension, clientFilter, projectFilter, categoryFilter)
				: undefined,
		[stackDimension, clientFilter, projectFilter, categoryFilter],
	);

	// Non-stacked: use existing getDailyDurations
	const flatData = useQuery(
		api.time_entries.getDailyDurations,
		stackDimension === null
			? {
					filters: {
						dateRange: range,
					},
				}
			: "skip",
	);

	// Stacked: use getDailyDurationBreakdown
	const breakdownData = useQuery(
		api.time_entries.getDailyDurationBreakdown,
		stackDimension !== null
			? {
					groupBy: stackDimension,
					entityIds,
					constraintFilters,
					dateRange: range,
				}
			: "skip",
	);

	// Build entity name map for stacked mode
	const entityNameMap = useMemo(() => {
		const map = new Map<string, string>();
		if (stackDimension === "client") {
			for (const c of clientFilter) map.set(c._id, c.name);
		} else if (stackDimension === "project") {
			for (const p of projectFilter) map.set(p._id, p.name);
		} else if (stackDimension === "category") {
			for (const c of categoryFilter) map.set(c._id, c.name);
		}
		return map;
	}, [stackDimension, clientFilter, projectFilter, categoryFilter]);

	return useMemo((): AnalyticsChartData => {
		if (stackDimension === null || !breakdownData) {
			// Non-stacked mode
			const data = (flatData ?? []).map((d) => ({
				date: d.date,
				hours: Math.round((d.duration / 3_600_000) * 100) / 100,
			}));
			const total = data.reduce((acc, curr) => acc + (curr.hours as number), 0);
			const daysWithData = data.filter((d) => d.hours > 0).length;

			let busiest: { date: string; hours: number } | null = null;
			for (const d of data) {
				if (!busiest || d.hours > busiest.hours) {
					busiest = { date: d.date, hours: d.hours };
				}
			}

			return {
				chartData: data,
				chartConfig: {
					hours: {
						label: "Hours",
						color: "var(--chart-1)",
					},
				},
				entityKeys: null,
				totalHours: total,
				avgDailyHours: daysWithData > 0 ? total / daysWithData : 0,
				busiestDay: busiest && busiest.hours > 0 ? busiest : null,
			};
		}

		// Stacked mode: transform breakdown data
		const keys: string[] = [];
		const config: ChartConfig = {};
		const seenKeys = new Set<string>();

		for (const entityId of entityIds) {
			const name = entityNameMap.get(entityId) ?? "Unknown";
			let key = slugify(name);
			if (seenKeys.has(key)) {
				key = `${key}_${entityId.slice(-4)}`;
			}
			seenKeys.add(key);
			keys.push(key);
			config[key] = {
				label: name,
				color: CHART_COLORS[(keys.length - 1) % CHART_COLORS.length],
			};
		}

		let total = 0;
		const data = breakdownData.map((day) => {
			const row: Record<string, unknown> = { date: day.date };
			let dayTotal = 0;
			for (let i = 0; i < day.breakdown.length; i++) {
				const hours = Math.round((day.breakdown[i].duration / 3_600_000) * 100) / 100;
				row[keys[i]] = hours;
				total += hours;
				dayTotal += hours;
			}
			row._totalHours = dayTotal;
			return row;
		});

		const daysWithData = data.filter((d) => (d._totalHours as number) > 0).length;

		let busiest: { date: string; hours: number } | null = null;
		for (const d of data) {
			const dayHours = d._totalHours as number;
			if (!busiest || dayHours > busiest.hours) {
				busiest = { date: d.date as string, hours: dayHours };
			}
		}

		return {
			chartData: data,
			chartConfig: config,
			entityKeys: keys,
			totalHours: total,
			avgDailyHours: daysWithData > 0 ? total / daysWithData : 0,
			busiestDay: busiest && busiest.hours > 0 ? busiest : null,
		};
	}, [stackDimension, flatData, breakdownData, entityIds, entityNameMap]);
}
