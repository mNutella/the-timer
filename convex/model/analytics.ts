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

async function sumDurationForDay(
	ctx: QueryCtx,
	userId: Id<"users">,
	dayStart: number,
	dayEnd: number,
	filters: {
		clientIds?: string[] | null;
		projectIds?: string[] | null;
		categoryIds?: string[] | null;
	},
) {
	const clientIds = filters.clientIds ?? [];
	const projectIds = filters.projectIds ?? [];
	const categoryIds = filters.categoryIds ?? [];

	if (clientIds.length > 0) {
		const totals = await Promise.all(
			clientIds.map((clientId) =>
				timeEntriesTotalDurationByClientAndDateAggregate.sum(ctx, {
					namespace: userId,
					bounds: {
						lower: { key: [clientId, dayStart], inclusive: true },
						upper: { key: [clientId, dayEnd], inclusive: true },
					},
				}),
			),
		);
		return totals.reduce((sum, t) => sum + t, 0);
	}

	if (projectIds.length > 0) {
		const totals = await Promise.all(
			projectIds.map((projectId) =>
				timeEntriesTotalDurationByProjectAndDateAggregate.sum(ctx, {
					namespace: userId,
					bounds: {
						lower: { key: [projectId, dayStart], inclusive: true },
						upper: { key: [projectId, dayEnd], inclusive: true },
					},
				}),
			),
		);
		return totals.reduce((sum, t) => sum + t, 0);
	}

	if (categoryIds.length > 0) {
		const totals = await Promise.all(
			categoryIds.map((categoryId) =>
				timeEntriesTotalDurationByCategoryAndDateAggregate.sum(ctx, {
					namespace: userId,
					bounds: {
						lower: { key: [categoryId, dayStart], inclusive: true },
						upper: { key: [categoryId, dayEnd], inclusive: true },
					},
				}),
			),
		);
		return totals.reduce((sum, t) => sum + t, 0);
	}

	return timeEntriesTotalDurationByDateAggregate.sum(ctx, {
		namespace: userId,
		bounds: {
			lower: { key: [dayStart], inclusive: true },
			upper: { key: [dayEnd], inclusive: true },
		},
	});
}

export async function getDailyDurationTimeSeries(
	ctx: QueryCtx,
	{
		userId,
		filters,
	}: {
		userId: Id<"users">;
		filters: {
			clientIds?: string[] | null;
			projectIds?: string[] | null;
			categoryIds?: string[] | null;
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

		const duration = await sumDurationForDay(ctx, userId, dayStart, dayEnd, {
			clientIds: filters.clientIds,
			projectIds: filters.projectIds,
			categoryIds: filters.categoryIds,
		});

		results.push({ date: formatDate(current.getTime()), duration });

		current.setDate(current.getDate() + 1);
	}

	return results;
}

export async function getDailyDurationBreakdownTimeSeries(
	ctx: QueryCtx,
	{
		userId,
		groupBy,
		entityIds,
		constraintFilters,
		dateRange,
	}: {
		userId: Id<"users">;
		groupBy: "client" | "project" | "category";
		entityIds: string[];
		constraintFilters?: {
			clientIds?: string[];
			projectIds?: string[];
			categoryIds?: string[];
		};
		dateRange: { startDate: number; endDate: number };
	},
) {
	const { startDate, endDate } = dateRange;

	// Look up entity names upfront
	const entityNames = new Map<string, string>();
	for (const id of entityIds) {
		if (groupBy === "client") {
			const entity = await ctx.table("clients").get(id as Id<"clients">);
			entityNames.set(id, entity?.name ?? "Unknown");
		} else if (groupBy === "project") {
			const entity = await ctx.table("projects").get(id as Id<"projects">);
			entityNames.set(id, entity?.name ?? "Unknown");
		} else {
			const entity = await ctx.table("categories").get(id as Id<"categories">);
			entityNames.set(id, entity?.name ?? "Unknown");
		}
	}

	// Determine if we have cross-dimensional filters
	const clientConstraints = constraintFilters?.clientIds ?? [];
	const projectConstraints = constraintFilters?.projectIds ?? [];
	const categoryConstraints = constraintFilters?.categoryIds ?? [];
	const hasCrossFilters =
		clientConstraints.length > 0 ||
		projectConstraints.length > 0 ||
		categoryConstraints.length > 0;

	if (!hasCrossFilters) {
		// Fast path: use aggregates per entity per day
		return getDailyBreakdownFromAggregates(ctx, {
			userId,
			groupBy,
			entityIds,
			entityNames,
			startDate,
			endDate,
		});
	}

	// Slow path: query entries and group manually
	return getDailyBreakdownFromEntries(ctx, {
		userId,
		groupBy,
		entityIds,
		entityNames,
		constraintFilters: {
			clientIds: clientConstraints,
			projectIds: projectConstraints,
			categoryIds: categoryConstraints,
		},
		startDate,
		endDate,
	});
}

async function getDailyBreakdownFromAggregates(
	ctx: QueryCtx,
	{
		userId,
		groupBy,
		entityIds,
		entityNames,
		startDate,
		endDate,
	}: {
		userId: Id<"users">;
		groupBy: "client" | "project" | "category";
		entityIds: string[];
		entityNames: Map<string, string>;
		startDate: number;
		endDate: number;
	},
) {
	const results: Array<{
		date: string;
		breakdown: Array<{ entityId: string; name: string; duration: number }>;
	}> = [];

	const aggregate =
		groupBy === "client"
			? timeEntriesTotalDurationByClientAndDateAggregate
			: groupBy === "project"
				? timeEntriesTotalDurationByProjectAndDateAggregate
				: timeEntriesTotalDurationByCategoryAndDateAggregate;

	const current = new Date(startDate);
	const end = new Date(endDate);

	while (current <= end) {
		const dayStart = getStartOfDay(current.getTime());
		const dayEnd = getEndOfDay(current.getTime());
		const breakdown: Array<{
			entityId: string;
			name: string;
			duration: number;
		}> = [];

		for (const entityId of entityIds) {
			const duration = await aggregate.sum(ctx, {
				namespace: userId,
				bounds: {
					lower: { key: [entityId, dayStart], inclusive: true },
					upper: { key: [entityId, dayEnd], inclusive: true },
				},
			});
			breakdown.push({
				entityId,
				name: entityNames.get(entityId) ?? "Unknown",
				duration,
			});
		}

		results.push({ date: formatDate(current.getTime()), breakdown });
		current.setDate(current.getDate() + 1);
	}

	return results;
}

async function getDailyBreakdownFromEntries(
	ctx: QueryCtx,
	{
		userId,
		groupBy,
		entityIds,
		entityNames,
		constraintFilters,
		startDate,
		endDate,
	}: {
		userId: Id<"users">;
		groupBy: "client" | "project" | "category";
		entityIds: string[];
		entityNames: Map<string, string>;
		constraintFilters: {
			clientIds: string[];
			projectIds: string[];
			categoryIds: string[];
		};
		startDate: number;
		endDate: number;
	},
) {
	const dayStart = getStartOfDay(startDate);
	const dayEnd = getEndOfDay(endDate);
	const entityIdSet = new Set(entityIds);

	// Query entries using composite indexes with date bounds
	const indexName =
		groupBy === "client"
			? ("by_user_client_start" as const)
			: groupBy === "project"
				? ("by_user_project_start" as const)
				: ("by_user_category_start" as const);

	const fieldName =
		groupBy === "client"
			? "clientId"
			: groupBy === "project"
				? "projectId"
				: "categoryId";

	type EntryLike = {
		start_time?: number;
		duration?: number;
		clientId?: Id<"clients">;
		projectId?: Id<"projects">;
		categoryId?: Id<"categories">;
	};
	const allEntries: EntryLike[] = [];

	for (const entityId of entityIds) {
		const entries = await ctx.table("time_entries", indexName, (q) => {
			if (groupBy === "client") {
				return q
					.eq("userId", userId)
					.eq("clientId", entityId as Id<"clients">)
					.gte("start_time", dayStart)
					.lte("start_time", dayEnd);
			}
			if (groupBy === "project") {
				return q
					.eq("userId", userId)
					.eq("projectId", entityId as Id<"projects">)
					.gte("start_time", dayStart)
					.lte("start_time", dayEnd);
			}
			return q
				.eq("userId", userId)
				.eq("categoryId", entityId as Id<"categories">)
				.gte("start_time", dayStart)
				.lte("start_time", dayEnd);
		});
		allEntries.push(...entries);
	}

	// Apply cross-dimensional constraint filters
	const clientSet = new Set(constraintFilters.clientIds);
	const projectSet = new Set(constraintFilters.projectIds);
	const categorySet = new Set(constraintFilters.categoryIds);

	// Group by day + entity
	const dayEntityMap = new Map<string, Map<string, number>>();

	for (const entry of allEntries) {
		if (!entry.start_time || !entry.duration) continue;

		// Apply constraint filters
		if (clientSet.size > 0 && !clientSet.has(entry.clientId ?? "")) continue;
		if (projectSet.size > 0 && !projectSet.has(entry.projectId ?? "")) continue;
		if (categorySet.size > 0 && !categorySet.has(entry.categoryId ?? ""))
			continue;

		const entityId = (entry[fieldName] as string) ?? "";
		if (!entityIdSet.has(entityId)) continue;

		const date = formatDate(entry.start_time);
		if (!dayEntityMap.has(date)) {
			dayEntityMap.set(date, new Map());
		}
		const entityMap = dayEntityMap.get(date)!;
		entityMap.set(entityId, (entityMap.get(entityId) ?? 0) + entry.duration);
	}

	// Build results for every day in range
	const results: Array<{
		date: string;
		breakdown: Array<{ entityId: string; name: string; duration: number }>;
	}> = [];

	const current = new Date(startDate);
	const end = new Date(endDate);

	while (current <= end) {
		const date = formatDate(current.getTime());
		const entityMap = dayEntityMap.get(date);
		const breakdown = entityIds.map((entityId) => ({
			entityId,
			name: entityNames.get(entityId) ?? "Unknown",
			duration: entityMap?.get(entityId) ?? 0,
		}));
		results.push({ date, breakdown });
		current.setDate(current.getDate() + 1);
	}

	return results;
}

export async function getEntityBreakdown(
	ctx: QueryCtx,
	{
		userId,
		groupBy,
		entityIds,
		constraintFilters,
		dateRange,
	}: {
		userId: Id<"users">;
		groupBy: "client" | "project" | "category";
		entityIds?: string[];
		constraintFilters?: {
			clientIds?: string[];
			projectIds?: string[];
			categoryIds?: string[];
		};
		dateRange: { startDate: number; endDate: number };
	},
) {
	const { startDate, endDate } = dateRange;

	const clientConstraints = constraintFilters?.clientIds ?? [];
	const projectConstraints = constraintFilters?.projectIds ?? [];
	const categoryConstraints = constraintFilters?.categoryIds ?? [];
	const hasCrossFilters =
		clientConstraints.length > 0 ||
		projectConstraints.length > 0 ||
		categoryConstraints.length > 0;

	// Resolve entity IDs and names
	let ids: string[];
	const entityNames = new Map<string, string>();

	if (entityIds && entityIds.length > 0) {
		ids = entityIds;
		for (const id of ids) {
			if (groupBy === "client") {
				const entity = await ctx.table("clients").get(id as Id<"clients">);
				entityNames.set(id, entity?.name ?? "Unknown");
			} else if (groupBy === "project") {
				const entity = await ctx.table("projects").get(id as Id<"projects">);
				entityNames.set(id, entity?.name ?? "Unknown");
			} else {
				const entity = await ctx
					.table("categories")
					.get(id as Id<"categories">);
				entityNames.set(id, entity?.name ?? "Unknown");
			}
		}
	} else {
		ids = [];
		const edgeName =
			groupBy === "client"
				? "clients"
				: groupBy === "project"
					? "projects"
					: "categories";
		const entities = await ctx.table("users").getX(userId).edge(edgeName);
		for (const e of entities) {
			ids.push(e._id);
			entityNames.set(e._id, e.name);
		}
	}

	if (!hasCrossFilters) {
		const aggregate =
			groupBy === "client"
				? timeEntriesTotalDurationByClientAndDateAggregate
				: groupBy === "project"
					? timeEntriesTotalDurationByProjectAndDateAggregate
					: timeEntriesTotalDurationByCategoryAndDateAggregate;

		const results: Array<{
			entityId: string;
			name: string;
			duration: number;
		}> = [];

		for (const entityId of ids) {
			const duration = await aggregate.sum(ctx, {
				namespace: userId,
				bounds: {
					lower: {
						key: [entityId, getStartOfDay(startDate)],
						inclusive: true,
					},
					upper: {
						key: [entityId, getEndOfDay(endDate)],
						inclusive: true,
					},
				},
			});
			if (duration > 0) {
				results.push({
					entityId,
					name: entityNames.get(entityId) ?? "Unknown",
					duration,
				});
			}
		}

		// Add unassigned bucket when showing all entities
		if (!entityIds || entityIds.length === 0) {
			const unassignedDuration = await aggregate.sum(ctx, {
				namespace: userId,
				bounds: {
					lower: { key: ["", getStartOfDay(startDate)], inclusive: true },
					upper: { key: ["", getEndOfDay(endDate)], inclusive: true },
				},
			});
			if (unassignedDuration > 0) {
				const label =
					groupBy === "client"
						? "No Client"
						: groupBy === "project"
							? "No Project"
							: "Uncategorized";
				results.push({
					entityId: "",
					name: label,
					duration: unassignedDuration,
				});
			}
		}

		results.sort((a, b) => b.duration - a.duration);
		return results;
	}

	// Slow path: cross-dimensional filters require entry-level queries
	return getEntityBreakdownFromEntries(ctx, {
		userId,
		groupBy,
		entityIds: ids,
		entityNames,
		constraintFilters: {
			clientIds: clientConstraints,
			projectIds: projectConstraints,
			categoryIds: categoryConstraints,
		},
		startDate,
		endDate,
	});
}

async function getEntityBreakdownFromEntries(
	ctx: QueryCtx,
	{
		userId,
		groupBy,
		entityIds,
		entityNames,
		constraintFilters,
		startDate,
		endDate,
	}: {
		userId: Id<"users">;
		groupBy: "client" | "project" | "category";
		entityIds: string[];
		entityNames: Map<string, string>;
		constraintFilters: {
			clientIds: string[];
			projectIds: string[];
			categoryIds: string[];
		};
		startDate: number;
		endDate: number;
	},
) {
	const dayStart = getStartOfDay(startDate);
	const dayEnd = getEndOfDay(endDate);
	const entityIdSet = new Set(entityIds);

	const indexName =
		groupBy === "client"
			? ("by_user_client_start" as const)
			: groupBy === "project"
				? ("by_user_project_start" as const)
				: ("by_user_category_start" as const);

	const fieldName =
		groupBy === "client"
			? "clientId"
			: groupBy === "project"
				? "projectId"
				: "categoryId";

	type EntryLike = {
		start_time?: number;
		duration?: number;
		clientId?: Id<"clients">;
		projectId?: Id<"projects">;
		categoryId?: Id<"categories">;
	};
	const allEntries: EntryLike[] = [];

	for (const entityId of entityIds) {
		const entries = await ctx.table("time_entries", indexName, (q) => {
			if (groupBy === "client") {
				return q
					.eq("userId", userId)
					.eq("clientId", entityId as Id<"clients">)
					.gte("start_time", dayStart)
					.lte("start_time", dayEnd);
			}
			if (groupBy === "project") {
				return q
					.eq("userId", userId)
					.eq("projectId", entityId as Id<"projects">)
					.gte("start_time", dayStart)
					.lte("start_time", dayEnd);
			}
			return q
				.eq("userId", userId)
				.eq("categoryId", entityId as Id<"categories">)
				.gte("start_time", dayStart)
				.lte("start_time", dayEnd);
		});
		allEntries.push(...entries);
	}

	const clientSet = new Set(constraintFilters.clientIds);
	const projectSet = new Set(constraintFilters.projectIds);
	const categorySet = new Set(constraintFilters.categoryIds);

	const durationByEntity = new Map<string, number>();
	for (const entry of allEntries) {
		if (!entry.start_time || !entry.duration) continue;
		if (clientSet.size > 0 && !clientSet.has(entry.clientId ?? "")) continue;
		if (projectSet.size > 0 && !projectSet.has(entry.projectId ?? "")) continue;
		if (categorySet.size > 0 && !categorySet.has(entry.categoryId ?? ""))
			continue;

		const entityId = (entry[fieldName] as string) ?? "";
		if (!entityIdSet.has(entityId)) continue;

		durationByEntity.set(
			entityId,
			(durationByEntity.get(entityId) ?? 0) + entry.duration,
		);
	}

	const results: Array<{ entityId: string; name: string; duration: number }> =
		[];
	for (const [entityId, duration] of durationByEntity) {
		if (duration > 0) {
			results.push({
				entityId,
				name: entityNames.get(entityId) ?? "Unknown",
				duration,
			});
		}
	}

	results.sort((a, b) => b.duration - a.duration);
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
			clientIds?: string[] | null;
			projectIds?: string[] | null;
			categoryIds?: string[] | null;
			dateRange: { startDate: number; endDate: number };
		};
	},
) {
	const { startDate, endDate } = filters.dateRange;
	const clientIds = filters.clientIds ?? [];
	const projectIds = filters.projectIds ?? [];
	const categoryIds = filters.categoryIds ?? [];
	const hasEntityFilter =
		clientIds.length > 0 || projectIds.length > 0 || categoryIds.length > 0;

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
			clientIds?: string[] | null;
			projectIds?: string[] | null;
			categoryIds?: string[] | null;
			dateRange: { startDate: number; endDate: number };
		};
	},
) {
	const { startDate, endDate } = filters.dateRange;
	const dayStart = getStartOfDay(startDate);
	const dayEnd = getEndOfDay(endDate);

	const clientIds = filters.clientIds ?? [];
	const projectIds = filters.projectIds ?? [];
	const categoryIds = filters.categoryIds ?? [];

	// Collect entries from all selected IDs
	const allEntries: Array<{
		start_time?: number;
		duration?: number;
		categoryId?: Id<"categories">;
	}> = [];

	if (clientIds.length > 0) {
		for (const clientId of clientIds) {
			const entries = await ctx.table(
				"time_entries",
				"by_user_client_start",
				(q) =>
					q
						.eq("userId", userId)
						.eq("clientId", clientId as Id<"clients">)
						.gte("start_time", dayStart)
						.lte("start_time", dayEnd),
			);
			allEntries.push(...entries);
		}
	} else if (projectIds.length > 0) {
		for (const projectId of projectIds) {
			const entries = await ctx.table(
				"time_entries",
				"by_user_project_start",
				(q) =>
					q
						.eq("userId", userId)
						.eq("projectId", projectId as Id<"projects">)
						.gte("start_time", dayStart)
						.lte("start_time", dayEnd),
			);
			allEntries.push(...entries);
		}
	} else if (categoryIds.length > 0) {
		for (const categoryId of categoryIds) {
			const entries = await ctx.table(
				"time_entries",
				"by_user_category_start",
				(q) =>
					q
						.eq("userId", userId)
						.eq("categoryId", categoryId as Id<"categories">)
						.gte("start_time", dayStart)
						.lte("start_time", dayEnd),
			);
			allEntries.push(...entries);
		}
	} else {
		return [];
	}

	// Build category lookup
	const categories = await ctx.table("users").getX(userId).edge("categories");
	const categoryMap = new Map<string, string>();
	for (const cat of categories) {
		categoryMap.set(cat._id, cat.name);
	}

	// Sum durations by category (date range already applied by index query)
	const durationByCategory = new Map<string, number>();
	for (const entry of allEntries) {
		if (!entry.start_time || !entry.duration) continue;

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
