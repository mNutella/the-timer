"use client";

import { useQuery } from "convex-helpers/react/cache";
import { useMemo } from "react";
import type { DateRange } from "react-day-picker";
import { Label, PolarRadiusAxis, RadialBar, RadialBarChart } from "recharts";
import { api } from "@/../convex/_generated/api";
import {
	getConstraintFilters,
	getEntityIds,
	getStackDimension,
} from "@/components/time-entries-chart-bar";
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

interface TimeEntriesChartRadialStackedProps {
	clientFilter: Client[];
	projectFilter: Project[];
	categoryFilter: Category[];
	dateRange?: DateRange;
}

export function TimeEntriesChartRadialStacked({
	clientFilter,
	projectFilter,
	categoryFilter,
	dateRange,
}: TimeEntriesChartRadialStackedProps) {
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

	const groupBy = stackDimension ?? "category";

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

	const rawData = useQuery(api.time_entries.getEntityBreakdown, {
		groupBy,
		entityIds: entityIds.length > 0 ? entityIds : undefined,
		constraintFilters,
		dateRange: range,
	});

	const { chartData, chartConfig, totalHours, entityKeys } = useMemo(() => {
		const entities = rawData ?? [];
		const dataObj: Record<string, number> = {};
		const config: ChartConfig = {};
		let total = 0;
		const keys: string[] = [];

		for (let i = 0; i < entities.length; i++) {
			const entity = entities[i];
			const hours = Math.round((entity.duration / 3_600_000) * 100) / 100;
			const key = entity.name.replace(/\s+/g, "_").toLowerCase();
			dataObj[key] = hours;
			total += hours;
			keys.push(key);
			config[key] = {
				label: entity.name,
				color: CHART_COLORS[i % CHART_COLORS.length],
			};
		}

		return {
			chartData: entities.length > 0 ? [dataObj] : [],
			chartConfig: config,
			totalHours: total,
			entityKeys: keys,
		};
	}, [rawData]);

	const filterDescription = getFilterDescription(
		clientFilter,
		projectFilter,
		categoryFilter,
	);

	const dimensionLabel =
		groupBy === "client"
			? "Client"
			: groupBy === "project"
				? "Project"
				: "Category";

	const dateLabel =
		dateRange?.from && dateRange?.to
			? `${dateRange.from.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${dateRange.to.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
			: "Last 3 months";

	return (
		<Card className="flex flex-col h-full">
			<CardHeader className="items-center py-2 pb-0">
				<CardTitle>Time by {dimensionLabel}</CardTitle>
				<CardDescription>{dateLabel}</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-1 items-center justify-center p-2">
				<ChartContainer
					config={chartConfig}
					className="mx-auto aspect-square w-full max-w-[240px]"
				>
					<RadialBarChart
						data={chartData}
						endAngle={360}
						innerRadius={70}
						outerRadius={115}
					>
						<ChartTooltip
							cursor={false}
							content={
								<ChartTooltipContent
									hideLabel
									description={filterDescription}
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
						<PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
							<Label
								content={({ viewBox }) => {
									if (viewBox && "cx" in viewBox && "cy" in viewBox) {
										return (
											<text
												x={viewBox.cx}
												y={viewBox.cy}
												textAnchor="middle"
												dominantBaseline="central"
											>
												<tspan
													x={viewBox.cx}
													y={(viewBox.cy || 0) - 8}
													className="fill-foreground text-xl font-bold"
												>
													{totalHours.toFixed(1)}
												</tspan>
												<tspan
													x={viewBox.cx}
													y={(viewBox.cy || 0) + 10}
													className="fill-muted-foreground text-xs"
												>
													Total hours
												</tspan>
											</text>
										);
									}
								}}
							/>
						</PolarRadiusAxis>
						{entityKeys.map((key, i) => (
							<RadialBar
								key={key}
								dataKey={key}
								stackId="a"
								cornerRadius={3}
								fill={CHART_COLORS[i % CHART_COLORS.length]}
								stroke="none"
							/>
						))}
					</RadialBarChart>
				</ChartContainer>
			</CardContent>
		</Card>
	);
}
