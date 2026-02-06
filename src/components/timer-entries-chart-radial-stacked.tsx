"use client";

import { useQuery } from "convex-helpers/react/cache";
import { useMemo } from "react";
import type { DateRange } from "react-day-picker";
import { Label, PolarRadiusAxis, RadialBar, RadialBarChart } from "recharts";
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

const CHART_COLORS = [
	"var(--chart-1)",
	"var(--chart-2)",
	"var(--chart-3)",
	"var(--chart-4)",
	"var(--chart-5)",
];

function getDefaultDateRange(): { startDate: number; endDate: number } {
	const end = new Date();
	const start = new Date();
	start.setMonth(start.getMonth() - 3);
	return { startDate: start.getTime(), endDate: end.getTime() };
}

interface TimeEntriesChartRadialStackedProps {
	clientFilter?: Client;
	projectFilter?: Project;
	categoryFilter?: Category;
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

	const rawData = useQuery(api.time_entries.getCategoryBreakdown, {
		userId: import.meta.env.VITE_USER_ID as Id<"users">,
		clientId: clientFilter?._id,
		projectId: projectFilter?._id,
		categoryId: categoryFilter?._id,
		dateRange: range,
	});

	const { chartData, chartConfig, totalHours, categoryKeys } = useMemo(() => {
		const categories = rawData ?? [];
		const dataObj: Record<string, number> = {};
		const config: ChartConfig = {};
		let total = 0;
		const keys: string[] = [];

		for (let i = 0; i < categories.length; i++) {
			const cat = categories[i];
			const hours = Math.round((cat.duration / 3_600_000) * 100) / 100;
			const key = cat.name.replace(/\s+/g, "_").toLowerCase();
			dataObj[key] = hours;
			total += hours;
			keys.push(key);
			config[key] = {
				label: cat.name,
				color: CHART_COLORS[i % CHART_COLORS.length],
			};
		}

		return {
			chartData: categories.length > 0 ? [dataObj] : [],
			chartConfig: config,
			totalHours: total,
			categoryKeys: keys,
		};
	}, [rawData]);

	const dateLabel =
		dateRange?.from && dateRange?.to
			? `${dateRange.from.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${dateRange.to.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
			: "Last 3 months";

	return (
		<Card className="flex flex-col h-full">
			<CardHeader className="items-center pb-0">
				<CardTitle>Time by Category</CardTitle>
				<CardDescription>{dateLabel}</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-1 items-center pb-0">
				<ChartContainer
					config={chartConfig}
					className="mx-auto p-0 aspect-video w-full max-w-[450px] h-full"
				>
					<RadialBarChart
						data={chartData}
						endAngle={360}
						innerRadius={100}
						outerRadius={160}
					>
						<ChartTooltip
							cursor={false}
							content={
								<ChartTooltipContent
									hideLabel
									formatter={(value) => [`${Number(value).toFixed(1)}h`]}
								/>
							}
						/>
						<PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
							<Label
								content={({ viewBox }) => {
									if (viewBox && "cx" in viewBox && "cy" in viewBox) {
										return (
											<text x={viewBox.cx} y={viewBox.cy} textAnchor="middle">
												<tspan
													x={viewBox.cx}
													y={(viewBox.cy || 0) - 16}
													className="fill-foreground text-2xl font-bold"
												>
													{totalHours.toFixed(1)}
												</tspan>
												<tspan
													x={viewBox.cx}
													y={(viewBox.cy || 0) + 4}
													className="fill-muted-foreground"
												>
													Total hours
												</tspan>
											</text>
										);
									}
								}}
							/>
						</PolarRadiusAxis>
						{categoryKeys.map((key, i) => (
							<RadialBar
								key={key}
								dataKey={key}
								stackId="a"
								cornerRadius={5}
								fill={CHART_COLORS[i % CHART_COLORS.length]}
								className="stroke-transparent stroke-2"
							/>
						))}
					</RadialBarChart>
				</ChartContainer>
			</CardContent>
		</Card>
	);
}
