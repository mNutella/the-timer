"use client";

import type { DateRange } from "react-day-picker";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
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

export type StackDimension = "client" | "project" | "category";

export function getStackDimension(
	clientFilter: Client[],
	projectFilter: Project[],
	categoryFilter: Category[],
): StackDimension | null {
	if (clientFilter.length > 0) return "client";
	if (projectFilter.length > 0) return "project";
	if (categoryFilter.length > 0) return "category";
	return null;
}

export function getEntityIds(
	dimension: StackDimension,
	clientFilter: Client[],
	projectFilter: Project[],
	categoryFilter: Category[],
): string[] {
	if (dimension === "client") return clientFilter.map((c) => c._id);
	if (dimension === "project") return projectFilter.map((p) => p._id);
	return categoryFilter.map((c) => c._id);
}

export function getConstraintFilters(
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
	chartData: Record<string, unknown>[];
	chartConfig: ChartConfig;
	entityKeys: string[] | null;
	totalHours: number;
	clientFilter: Client[];
	projectFilter: Project[];
	categoryFilter: Category[];
	dateRange?: DateRange;
}

export function TimeEntriesChartBarInteractive({
	chartData,
	chartConfig,
	entityKeys,
	totalHours,
	clientFilter,
	projectFilter,
	categoryFilter,
	dateRange,
}: TimeEntriesChartBarInteractiveProps) {
	const filterDescription = getFilterDescription(
		clientFilter,
		projectFilter,
		categoryFilter,
	);

	const dateLabel =
		dateRange?.from && dateRange?.to
			? `${dateRange.from.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${dateRange.to.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
			: "Last 3 months";

	return (
		<Card className="py-0 h-full">
			<CardHeader className="flex flex-col items-stretch border-b !p-0 sm:flex-row">
				<div className="flex flex-1 flex-col justify-center gap-1 px-6 py-2">
					<CardTitle>Daily Time Tracked</CardTitle>
					<CardDescription>{dateLabel}</CardDescription>
				</div>
				<div className="flex">
					<div className="relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-2 sm:border-t-0 sm:border-l sm:px-8">
						<span className="text-muted-foreground text-xs">Total Hours</span>
						<span className="text-lg leading-none font-bold sm:text-2xl">
							{totalHours.toFixed(1)}h
						</span>
					</div>
				</div>
			</CardHeader>
			<CardContent className="px-2 sm:px-4 sm:py-3">
				<ChartContainer
					config={chartConfig}
					className="aspect-auto h-[240px] w-full"
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
