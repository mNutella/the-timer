import type { Id } from "../_generated/dataModel";
import {
	timeEntriesTotalDurationByCategoryAndDateAggregate,
	timeEntriesTotalDurationByClientAndDateAggregate,
	timeEntriesTotalDurationByDateAggregate,
	timeEntriesTotalDurationByProjectAndDateAggregate,
} from "../aggregates";
import type { QueryCtx } from "../types";
import { getEndOfDay, getStartOfDay } from "../utils";

function formatDate(timestamp: number): string {
	const d = new Date(timestamp);
	const year = d.getFullYear();
	const month = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

export async function getTotalHoursByDate(
	ctx: QueryCtx,
	{
		userId,
		filters,
	}: {
		userId: Id<"users">;
		filters: {
			dateRange: { startDate: number; endDate: number };
		};
	},
) {
	const { startDate, endDate } = filters?.dateRange ?? {};

	let totalDuration = 0;
	if (startDate !== undefined) {
		totalDuration = await timeEntriesTotalDurationByDateAggregate.sum(ctx, {
			namespace: userId,
			bounds: {
				lower: {
					key: [getStartOfDay(startDate ?? 0)],
					inclusive: true,
				},
				upper: {
					key: [getEndOfDay(endDate ?? 0)],
					inclusive: true,
				},
			},
		});
	}

	return totalDuration;
}

export async function getTotalHoursByClientAndDate(
	ctx: QueryCtx,
	{
		userId,
		filters,
	}: {
		userId: Id<"users">;
		filters: {
			clientId?: string | null;
			dateRange: { startDate: number; endDate: number };
		};
	},
) {
	const { clientId } = filters ?? {};
	const { startDate, endDate } = filters?.dateRange ?? {};

	let totalDuration = 0;
	if (startDate !== undefined) {
		totalDuration = await timeEntriesTotalDurationByClientAndDateAggregate.sum(
			ctx,
			{
				namespace: userId,
				bounds: {
					lower: {
						key: [clientId ?? "", getStartOfDay(startDate ?? 0)],
						inclusive: true,
					},
					upper: {
						key: [clientId ?? "\uffff", getEndOfDay(endDate ?? 0)],
						inclusive: true,
					},
				},
			},
		);
	}

	return totalDuration;
}

export async function getTotalHoursByProjectAndDate(
	ctx: QueryCtx,
	{
		userId,
		filters,
	}: {
		userId: Id<"users">;
		filters: {
			projectId?: string | null;
			dateRange: { startDate: number; endDate: number };
		};
	},
) {
	const { projectId } = filters ?? {};
	const { startDate, endDate } = filters?.dateRange ?? {};

	let totalDuration = 0;
	if (startDate !== undefined) {
		totalDuration = await timeEntriesTotalDurationByProjectAndDateAggregate.sum(
			ctx,
			{
				namespace: userId,
				bounds: {
					lower: {
						key: [projectId ?? "", getStartOfDay(startDate ?? 0)],
						inclusive: true,
					},
					upper: {
						key: [projectId ?? "\uffff", getEndOfDay(endDate ?? 0)],
						inclusive: true,
					},
				},
			},
		);
	}

	return totalDuration;
}

export async function getTotalHoursByCategoryAndDate(
	ctx: QueryCtx,
	{
		userId,
		filters,
	}: {
		userId: Id<"users">;
		filters: {
			categoryId?: string | null;
			dateRange: { startDate: number; endDate: number };
		};
	},
) {
	const { categoryId } = filters ?? {};
	const { startDate, endDate } = filters?.dateRange ?? {};

	let totalDuration = 0;
	if (startDate !== undefined) {
		totalDuration =
			await timeEntriesTotalDurationByCategoryAndDateAggregate.sum(ctx, {
				namespace: userId,
				bounds: {
					lower: {
						key: [categoryId ?? "", getStartOfDay(startDate ?? 0)],
						inclusive: true,
					},
					upper: {
						key: [categoryId ?? "\uffff", getEndOfDay(endDate ?? 0)],
						inclusive: true,
					},
				},
			});
	}

	return totalDuration;
}

export async function getDailyDurationTimeSeries(
	ctx: QueryCtx,
	{
		userId,
		filters,
	}: {
		userId: Id<"users">;
		filters: {
			clientId?: string | null;
			projectId?: string | null;
			categoryId?: string | null;
			dateRange: { startDate: number; endDate: number };
		};
	},
) {
	const { startDate, endDate } = filters.dateRange;
	const results: Array<{ date: string; duration: number }> = [];

	const current = new Date(startDate);
	const end = new Date(endDate);

	while (current <= end) {
		const dayStart = getStartOfDay(current.getTime());
		const dayEnd = getEndOfDay(current.getTime());

		let duration = 0;

		if (filters.clientId) {
			duration = await timeEntriesTotalDurationByClientAndDateAggregate.sum(
				ctx,
				{
					namespace: userId,
					bounds: {
						lower: { key: [filters.clientId, dayStart], inclusive: true },
						upper: { key: [filters.clientId, dayEnd], inclusive: true },
					},
				},
			);
		} else if (filters.projectId) {
			duration = await timeEntriesTotalDurationByProjectAndDateAggregate.sum(
				ctx,
				{
					namespace: userId,
					bounds: {
						lower: { key: [filters.projectId, dayStart], inclusive: true },
						upper: { key: [filters.projectId, dayEnd], inclusive: true },
					},
				},
			);
		} else if (filters.categoryId) {
			duration = await timeEntriesTotalDurationByCategoryAndDateAggregate.sum(
				ctx,
				{
					namespace: userId,
					bounds: {
						lower: { key: [filters.categoryId, dayStart], inclusive: true },
						upper: { key: [filters.categoryId, dayEnd], inclusive: true },
					},
				},
			);
		} else {
			duration = await timeEntriesTotalDurationByDateAggregate.sum(ctx, {
				namespace: userId,
				bounds: {
					lower: { key: [dayStart], inclusive: true },
					upper: { key: [dayEnd], inclusive: true },
				},
			});
		}

		results.push({ date: formatDate(current.getTime()), duration });

		current.setDate(current.getDate() + 1);
	}

	return results;
}

export async function getCategoryBreakdown(
	ctx: QueryCtx,
	{
		userId,
		filters,
	}: {
		userId: Id<"users">;
		filters: {
			clientId?: string | null;
			projectId?: string | null;
			categoryId?: string | null;
			dateRange: { startDate: number; endDate: number };
		};
	},
) {
	const { startDate, endDate } = filters.dateRange;
	const hasEntityFilter =
		filters.clientId || filters.projectId || filters.categoryId;

	// When filtering by client/project/category, we can't use category aggregates
	// directly — query time entries via index and sum by category
	if (hasEntityFilter) {
		return getCategoryBreakdownFromEntries(ctx, { userId, filters });
	}

	// Fast path: no entity filter, use pre-computed aggregates
	const categories = await ctx.table("users").getX(userId).edge("categories");

	const results: Array<{
		categoryId: string;
		name: string;
		duration: number;
	}> = [];

	for (const category of categories) {
		const duration =
			await timeEntriesTotalDurationByCategoryAndDateAggregate.sum(ctx, {
				namespace: userId,
				bounds: {
					lower: {
						key: [category._id, getStartOfDay(startDate)],
						inclusive: true,
					},
					upper: {
						key: [category._id, getEndOfDay(endDate)],
						inclusive: true,
					},
				},
			});

		if (duration > 0) {
			results.push({
				categoryId: category._id,
				name: category.name,
				duration,
			});
		}
	}

	const uncategorizedDuration =
		await timeEntriesTotalDurationByCategoryAndDateAggregate.sum(ctx, {
			namespace: userId,
			bounds: {
				lower: { key: ["", getStartOfDay(startDate)], inclusive: true },
				upper: { key: ["", getEndOfDay(endDate)], inclusive: true },
			},
		});

	if (uncategorizedDuration > 0) {
		results.push({
			categoryId: "",
			name: "Uncategorized",
			duration: uncategorizedDuration,
		});
	}

	results.sort((a, b) => b.duration - a.duration);

	return results;
}

async function getCategoryBreakdownFromEntries(
	ctx: QueryCtx,
	{
		userId,
		filters,
	}: {
		userId: Id<"users">;
		filters: {
			clientId?: string | null;
			projectId?: string | null;
			categoryId?: string | null;
			dateRange: { startDate: number; endDate: number };
		};
	},
) {
	const { startDate, endDate } = filters.dateRange;
	const dayStart = getStartOfDay(startDate);
	const dayEnd = getEndOfDay(endDate);

	const entries = filters.clientId
		? await ctx.table("time_entries", "by_user_and_client", (q) =>
				q
					.eq("userId", userId)
					.eq("clientId", filters.clientId as Id<"clients">),
			)
		: filters.projectId
			? await ctx.table("time_entries", "by_user_and_project", (q) =>
					q
						.eq("userId", userId)
						.eq("projectId", filters.projectId as Id<"projects">),
				)
			: filters.categoryId
				? await ctx.table("time_entries", "by_user_and_category", (q) =>
						q
							.eq("userId", userId)
							.eq("categoryId", filters.categoryId as Id<"categories">),
					)
				: null;

	if (!entries) return [];

	// Build category lookup
	const categories = await ctx.table("users").getX(userId).edge("categories");
	const categoryMap = new Map<string, string>();
	for (const cat of categories) {
		categoryMap.set(cat._id, cat.name);
	}

	// Sum durations by category, filtering by date range
	const durationByCategory = new Map<string, number>();
	for (const entry of entries) {
		if (!entry.start_time || !entry.duration) continue;
		if (entry.start_time < dayStart || entry.start_time > dayEnd) continue;

		const catId = entry.categoryId ?? "";
		durationByCategory.set(
			catId,
			(durationByCategory.get(catId) ?? 0) + entry.duration,
		);
	}

	const results: Array<{
		categoryId: string;
		name: string;
		duration: number;
	}> = [];

	for (const [catId, duration] of durationByCategory) {
		if (duration > 0) {
			results.push({
				categoryId: catId,
				name: catId ? (categoryMap.get(catId) ?? "Unknown") : "Uncategorized",
				duration,
			});
		}
	}

	results.sort((a, b) => b.duration - a.duration);
	return results;
}
