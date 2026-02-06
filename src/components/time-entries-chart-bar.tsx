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
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import type { Category, Client, Project } from "@/lib/types";

const chartConfig = {
	hours: {
		label: "Hours",
		color: "var(--chart-1)",
	},
} satisfies ChartConfig;

function getDefaultDateRange(): { startDate: number; endDate: number } {
	const end = new Date();
	const start = new Date();
	start.setMonth(start.getMonth() - 3);
	return { startDate: start.getTime(), endDate: end.getTime() };
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

	const rawData = useQuery(api.time_entries.getDailyDurations, {
		userId: import.meta.env.VITE_USER_ID as Id<"users">,
		filters: {
			clientIds: clientFilter.map((c) => c._id),
			projectIds: projectFilter.map((p) => p._id),
			categoryIds: categoryFilter.map((c) => c._id),
			dateRange: range,
		},
	});

	const chartData = (rawData ?? []).map((d) => ({
		date: d.date,
		hours: Math.round((d.duration / 3_600_000) * 100) / 100,
	}));

	const totalHours = chartData.reduce((acc, curr) => acc + curr.hours, 0);

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
									className="w-[150px]"
									nameKey="hours"
									labelFormatter={(value) => {
										return new Date(value).toLocaleDateString("en-US", {
											month: "short",
											day: "numeric",
											year: "numeric",
										});
									}}
									formatter={(value) => [
										`${Number(value).toFixed(1)}h`,
										"Hours",
									]}
								/>
							}
						/>
						<Bar dataKey="hours" fill="var(--color-hours)" />
					</BarChart>
				</ChartContainer>
			</CardContent>
		</Card>
	);
}
