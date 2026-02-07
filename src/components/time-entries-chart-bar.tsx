"use client";

import { useQuery } from "convex-helpers/react/cache";
import { useMemo } from "react";
import type { DateRange } from "react-day-picker";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	type ChartConfig,
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import type { Category, Client, Project } from "@/lib/types";
import { CHART_COLORS, getFilterDescription } from "@/lib/utils";

function getDefaultDateRange(): { startDate: number; endDate: number } {
	const end = new Date();
	const start = new Date();
	start.setMonth(start.getMonth() - 3);
	return { startDate: start.getTime(), endDate: end.getTime() };
}

function slugify(name: string): string {
	return name.replace(/\s+/g, "_").toLowerCase();
}

type StackDimension = "client" | "project" | "category";

function getStackDimension(
	clientFilter: Client[],
	projectFilter: Project[],
	categoryFilter: Category[],
): StackDimension | null {
	if (clientFilter.length > 0) return "client";
	if (projectFilter.length > 0) return "project";
	if (categoryFilter.length > 0) return "category";
	return null;
}

function getEntityIds(
	dimension: StackDimension,
	clientFilter: Client[],
	projectFilter: Project[],
	categoryFilter: Category[],
): string[] {
	if (dimension === "client") return clientFilter.map((c) => c._id);
	if (dimension === "project") return projectFilter.map((p) => p._id);
	return categoryFilter.map((c) => c._id);
}

function getConstraintFilters(
	dimension: StackDimension,
	clientFilter: Client[],
	projectFilter: Project[],
	categoryFilter: Category[],
) {
	const constraints: {
		clientIds?: Id<"clients">[];
		projectIds?: Id<"projects">[];
		categoryIds?: Id<"categories">[];
	} = {};
	if (dimension !== "client" && clientFilter.length > 0) {
		constraints.clientIds = clientFilter.map((c) => c._id);
	}
	if (dimension !== "project" && projectFilter.length > 0) {
		constraints.projectIds = projectFilter.map((p) => p._id);
	}
	if (dimension !== "category" && categoryFilter.length > 0) {
		constraints.categoryIds = categoryFilter.map((c) => c._id);
	}
	return Object.keys(constraints).length > 0 ? constraints : undefined;
}

interface TimeEntriesChartBarInteractiveProps {
	clientFilter: Client[];
	projectFilter: Project[];
	categoryFilter: Category[];
	dateRange?: DateRange;
}

export function TimeEntriesChartBarInteractive({
	clientFilter,
	projectFilter,
	categoryFilter,
	dateRange,
}: TimeEntriesChartBarInteractiveProps) {
	const range = useMemo(() => {
		if (dateRange?.from && dateRange?.to) {
			return {
				startDate: dateRange.from.getTime(),
				endDate: dateRange.to.getTime(),
			};
		}
		return getDefaultDateRange();
	}, [dateRange?.from, dateRange?.to]);

	const stackDimension = useMemo(
		() => getStackDimension(clientFilter, projectFilter, categoryFilter),
		[clientFilter, projectFilter, categoryFilter],
	);

	const entityIds = useMemo(
		() =>
			stackDimension
				? getEntityIds(
						stackDimension,
						clientFilter,
						projectFilter,
						categoryFilter,
					)
				: [],
		[stackDimension, clientFilter, projectFilter, categoryFilter],
	);

	const constraintFilters = useMemo(
		() =>
			stackDimension
				? getConstraintFilters(
						stackDimension,
						clientFilter,
						projectFilter,
						categoryFilter,
					)
				: undefined,
		[stackDimension, clientFilter, projectFilter, categoryFilter],
	);

	// Non-stacked: use existing getDailyDurations
	const flatData = useQuery(
		api.time_entries.getDailyDurations,
		stackDimension === null
			? {
					userId: import.meta.env.VITE_USER_ID as Id<"users">,
					filters: {
						dateRange: range,
					},
				}
			: "skip",
	);

	// Stacked: use new getDailyDurationBreakdown
	const breakdownData = useQuery(
		api.time_entries.getDailyDurationBreakdown,
		stackDimension !== null
			? {
					userId: import.meta.env.VITE_USER_ID as Id<"users">,
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

	// Build chart data and config for stacked mode
	const { chartData, chartConfig, entityKeys, totalHours } = useMemo((): {
		chartData: Record<string, unknown>[];
		chartConfig: ChartConfig;
		entityKeys: string[] | null;
		totalHours: number;
	} => {
		if (stackDimension === null || !breakdownData) {
			// Non-stacked mode
			const data = (flatData ?? []).map((d) => ({
				date: d.date,
				hours: Math.round((d.duration / 3_600_000) * 100) / 100,
			}));
			const total = data.reduce((acc, curr) => acc + (curr.hours as number), 0);
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
			};
		}

		// Stacked mode: transform breakdown data
		const keys: string[] = [];
		const config: ChartConfig = {};
		const seenKeys = new Set<string>();

		for (const entityId of entityIds) {
			const name = entityNameMap.get(entityId) ?? "Unknown";
			let key = slugify(name);
			// Ensure unique keys
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
			for (let i = 0; i < day.breakdown.length; i++) {
				const hours =
					Math.round((day.breakdown[i].duration / 3_600_000) * 100) / 100;
				row[keys[i]] = hours;
				total += hours;
			}
			return row;
		});

		return {
			chartData: data,
			chartConfig: config,
			entityKeys: keys,
			totalHours: total,
		};
	}, [stackDimension, flatData, breakdownData, entityIds, entityNameMap]);

	const filterDescription = useMemo(
		() => getFilterDescription(clientFilter, projectFilter, categoryFilter),
		[clientFilter, projectFilter, categoryFilter],
	);

	const dateLabel =
		dateRange?.from && dateRange?.to
			? `${dateRange.from.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${dateRange.to.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
			: "Last 3 months";

	return (
		<Card className="py-0 h-full">
			<CardHeader className="flex flex-col items-stretch border-b !p-0 sm:flex-row">
				<div className="flex flex-1 flex-col justify-center gap-1 px-6 pt-4 pb-3 sm:!py-0">
					<CardTitle>Daily Time Tracked</CardTitle>
					<CardDescription>{dateLabel}</CardDescription>
				</div>
				<div className="flex">
					<div className="relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 sm:border-t-0 sm:border-l sm:px-8 sm:py-6">
						<span className="text-muted-foreground text-xs">Total Hours</span>
						<span className="text-lg leading-none font-bold sm:text-3xl">
							{totalHours.toFixed(1)}h
						</span>
					</div>
				</div>
			</CardHeader>
			<CardContent className="px-2 sm:p-6">
				<ChartContainer
					config={chartConfig}
					className="aspect-auto h-[250px] w-full"
				>
					<BarChart
						accessibilityLayer
						data={chartData}
						margin={{
							left: 12,
							right: 12,
						}}
					>
						<CartesianGrid vertical={false} />
						<XAxis
							dataKey="date"
							tickLine={false}
							axisLine={false}
							tickMargin={8}
							minTickGap={32}
							tickFormatter={(value) => {
								const date = new Date(value);
								return date.toLocaleDateString("en-US", {
									month: "short",
									day: "numeric",
								});
							}}
						/>
						<ChartTooltip
							content={
								<ChartTooltipContent
									className="w-[180px]"
									description={filterDescription}
									labelFormatter={(value) => {
										return new Date(value).toLocaleDateString("en-US", {
											month: "short",
											day: "numeric",
											year: "numeric",
										});
									}}
									formatter={(value, name) => [
										<span key="value" className="font-mono font-medium">
											{Number(value).toFixed(1)}h
										</span>,
										<span key="name" className="text-muted-foreground">
											{chartConfig[name as string]?.label ?? name}
										</span>,
									]}
								/>
							}
						/>
						{entityKeys ? (
							<>
								{entityKeys.map((key, i) => (
									<Bar
										key={key}
										dataKey={key}
										stackId="a"
										fill={CHART_COLORS[i % CHART_COLORS.length]}
										radius={
											i === entityKeys.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]
										}
									/>
								))}
								<ChartLegend content={<ChartLegendContent />} />
							</>
						) : (
							<Bar dataKey="hours" fill="var(--color-hours)" />
						)}
					</BarChart>
				</ChartContainer>
			</CardContent>
		</Card>
	);
}
