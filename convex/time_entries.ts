import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

import { mutation, query } from "./functions";
import * as Analytics from "./model/analytics";
import { getRequiredUserId } from "./model/auth";
import * as TimeEntries from "./model/time_entries";
import { getEndOfDay, getStartOfDay } from "./utils";

export const create = mutation({
	args: {
		name: v.string(),
		description: v.optional(v.string()),
		notes: v.optional(v.string()),
		categoryId: v.optional(v.id("categories")),
		projectId: v.optional(v.id("projects")),
		clientId: v.optional(v.id("clients")),
		tagIds: v.optional(v.array(v.id("tags"))),
		timeEntryId: v.optional(v.id("time_entries")),
	},
	handler: async (ctx, params) => {
		const userId = await getRequiredUserId(ctx);
		return TimeEntries.create(ctx, { ...params, userId });
	},
});

export const stop = mutation({
	args: {
		id: v.id("time_entries"),
	},
	handler: async (ctx, { id }) => {
		const userId = await getRequiredUserId(ctx);
		const timeEntry = await TimeEntries.stop(ctx, { id, userId });
		return timeEntry._id;
	},
});

export const update = mutation({
	args: {
		id: v.id("time_entries"),
		name: v.optional(v.string()),
		description: v.optional(v.string()),
		notes: v.optional(v.string()),
		categoryId: v.optional(v.id("categories")),
		projectId: v.optional(v.id("projects")),
		clientId: v.optional(v.id("clients")),
		tagIds: v.optional(v.array(v.id("tags"))),
		startDate: v.optional(v.number()),
		endDate: v.optional(v.number()),
		duration: v.optional(v.number()),
	},
	handler: async (ctx, params) => {
		const userId = await getRequiredUserId(ctx);
		await TimeEntries.update(ctx, { ...params, userId });
	},
});

export const deleteOne = mutation({
	args: {
		id: v.id("time_entries"),
	},
	handler: async (ctx, { id }) => {
		const userId = await getRequiredUserId(ctx);
		await TimeEntries.deleteOne(ctx, { id, userId });
	},
});

export const updateClient = mutation({
	args: {
		timeEntryId: v.id("time_entries"),
		clientId: v.optional(v.id("clients")),
		newClientName: v.optional(v.string()),
	},
	handler: async (ctx, params) => {
		const userId = await getRequiredUserId(ctx);
		const timeEntry = await TimeEntries.updateClient(ctx, {
			...params,
			userId,
		});
		return timeEntry._id;
	},
});

export const updateProject = mutation({
	args: {
		timeEntryId: v.id("time_entries"),
		projectId: v.optional(v.id("projects")),
		newProjectName: v.optional(v.string()),
	},
	handler: async (ctx, params) => {
		const userId = await getRequiredUserId(ctx);
		const timeEntry = await TimeEntries.updateProject(ctx, {
			...params,
			userId,
		});
		return timeEntry._id;
	},
});

export const updateCategory = mutation({
	args: {
		timeEntryId: v.id("time_entries"),
		categoryId: v.optional(v.id("categories")),
		newCategoryName: v.optional(v.string()),
	},
	handler: async (ctx, params) => {
		const userId = await getRequiredUserId(ctx);
		const timeEntry = await TimeEntries.updateCategory(ctx, {
			...params,
			userId,
		});
		return timeEntry._id;
	},
});

export const bulkDelete = mutation({
	args: {
		ids: v.array(v.id("time_entries")),
	},
	handler: async (ctx, { ids }) => {
		const userId = await getRequiredUserId(ctx);
		await TimeEntries.bulkDelete(ctx, { ids, userId });
	},
});

export const bulkUpdate = mutation({
	args: {
		ids: v.array(v.id("time_entries")),
		clientId: v.optional(v.id("clients")),
		projectId: v.optional(v.id("projects")),
		categoryId: v.optional(v.id("categories")),
	},
	handler: async (ctx, params) => {
		const userId = await getRequiredUserId(ctx);
		await TimeEntries.bulkUpdate(ctx, { ...params, userId });
	},
});

export const searchTimeEntries = query({
	args: {
		filters: v.optional(
			v.object({
				name: v.optional(v.string()),
				clientIds: v.optional(v.array(v.id("clients"))),
				projectIds: v.optional(v.array(v.id("projects"))),
				categoryIds: v.optional(v.array(v.id("categories"))),
				dateRange: v.optional(
					v.object({
						startDate: v.optional(v.number()),
						endDate: v.optional(v.number()),
					}),
				),
			}),
		),
		include: v.optional(
			v.object({
				client: v.optional(v.boolean()),
				project: v.optional(v.boolean()),
				category: v.optional(v.boolean()),
				tags: v.optional(v.boolean()),
			}),
		),
		paginationOpts: paginationOptsValidator,
	},
	handler: async (ctx, { filters, include, paginationOpts }) => {
		const userId = await getRequiredUserId(ctx);
		return TimeEntries.searchTimeEntries(ctx, {
			userId,
			filters,
			include,
			paginationOpts,
		});
	},
});

export const getDailyDurations = query({
	args: {
		filters: v.optional(
			v.object({
				clientIds: v.optional(v.array(v.id("clients"))),
				projectIds: v.optional(v.array(v.id("projects"))),
				categoryIds: v.optional(v.array(v.id("categories"))),
				dateRange: v.object({
					startDate: v.number(),
					endDate: v.number(),
				}),
			}),
		),
	},
	handler: async (ctx, { filters }) => {
		const userId = await getRequiredUserId(ctx);
		if (!filters?.dateRange) return [];
		return Analytics.getDailyDurationTimeSeries(ctx, {
			userId,
			filters: {
				clientIds: filters.clientIds,
				projectIds: filters.projectIds,
				categoryIds: filters.categoryIds,
				dateRange: {
					startDate: getStartOfDay(filters.dateRange.startDate),
					endDate: getEndOfDay(filters.dateRange.endDate),
				},
			},
		});
	},
});

export const getDailyDurationBreakdown = query({
	args: {
		groupBy: v.union(
			v.literal("client"),
			v.literal("project"),
			v.literal("category"),
		),
		entityIds: v.array(v.string()),
		constraintFilters: v.optional(
			v.object({
				clientIds: v.optional(v.array(v.id("clients"))),
				projectIds: v.optional(v.array(v.id("projects"))),
				categoryIds: v.optional(v.array(v.id("categories"))),
			}),
		),
		dateRange: v.object({
			startDate: v.number(),
			endDate: v.number(),
		}),
	},
	handler: async (
		ctx,
		{ groupBy, entityIds, constraintFilters, dateRange },
	) => {
		const userId = await getRequiredUserId(ctx);
		if (entityIds.length === 0) return [];
		return Analytics.getDailyDurationBreakdownTimeSeries(ctx, {
			userId,
			groupBy,
			entityIds,
			constraintFilters: constraintFilters
				? {
						clientIds: constraintFilters.clientIds,
						projectIds: constraintFilters.projectIds,
						categoryIds: constraintFilters.categoryIds,
					}
				: undefined,
			dateRange: {
				startDate: getStartOfDay(dateRange.startDate),
				endDate: getEndOfDay(dateRange.endDate),
			},
		});
	},
});

export const getEntityBreakdown = query({
	args: {
		groupBy: v.union(
			v.literal("client"),
			v.literal("project"),
			v.literal("category"),
		),
		entityIds: v.optional(v.array(v.string())),
		constraintFilters: v.optional(
			v.object({
				clientIds: v.optional(v.array(v.id("clients"))),
				projectIds: v.optional(v.array(v.id("projects"))),
				categoryIds: v.optional(v.array(v.id("categories"))),
			}),
		),
		dateRange: v.object({
			startDate: v.number(),
			endDate: v.number(),
		}),
	},
	handler: async (
		ctx,
		{ groupBy, entityIds, constraintFilters, dateRange },
	) => {
		const userId = await getRequiredUserId(ctx);
		return Analytics.getEntityBreakdown(ctx, {
			userId,
			groupBy,
			entityIds: entityIds && entityIds.length > 0 ? entityIds : undefined,
			constraintFilters: constraintFilters
				? {
						clientIds: constraintFilters.clientIds,
						projectIds: constraintFilters.projectIds,
						categoryIds: constraintFilters.categoryIds,
					}
				: undefined,
			dateRange: {
				startDate: getStartOfDay(dateRange.startDate),
				endDate: getEndOfDay(dateRange.endDate),
			},
		});
	},
});

export const getCategoryBreakdown = query({
	args: {
		clientIds: v.optional(v.array(v.id("clients"))),
		projectIds: v.optional(v.array(v.id("projects"))),
		categoryIds: v.optional(v.array(v.id("categories"))),
		dateRange: v.object({
			startDate: v.number(),
			endDate: v.number(),
		}),
	},
	handler: async (
		ctx,
		{ clientIds, projectIds, categoryIds, dateRange },
	) => {
		const userId = await getRequiredUserId(ctx);
		return Analytics.getCategoryBreakdown(ctx, {
			userId,
			filters: {
				clientIds,
				projectIds,
				categoryIds,
				dateRange: {
					startDate: getStartOfDay(dateRange.startDate),
					endDate: getEndOfDay(dateRange.endDate),
				},
			},
		});
	},
});

export const getTotalDuration = query({
	args: {
		filters: v.optional(
			v.object({
				name: v.optional(v.string()),
				clientIds: v.optional(v.array(v.id("clients"))),
				projectIds: v.optional(v.array(v.id("projects"))),
				categoryIds: v.optional(v.array(v.id("categories"))),
				dateRange: v.object({
					startDate: v.number(),
					endDate: v.number(),
				}),
			}),
		),
	},
	handler: async (ctx, { filters }) => {
		const userId = await getRequiredUserId(ctx);
		const { startDate, endDate } = filters?.dateRange ?? {};
		const dateRange = {
			startDate: getStartOfDay(startDate ?? 0),
			endDate: getEndOfDay(endDate ?? 0),
		};

		const clientIds = filters?.clientIds ?? [];
		const projectIds = filters?.projectIds ?? [];
		const categoryIds = filters?.categoryIds ?? [];

		if (clientIds.length > 0) {
			const totals = await Promise.all(
				clientIds.map((clientId) =>
					Analytics.getTotalHoursByClientAndDate(ctx, {
						userId,
						filters: { clientId, dateRange },
					}),
				),
			);
			return totals.reduce((sum, t) => sum + t, 0);
		}

		if (projectIds.length > 0) {
			const totals = await Promise.all(
				projectIds.map((projectId) =>
					Analytics.getTotalHoursByProjectAndDate(ctx, {
						userId,
						filters: { projectId, dateRange },
					}),
				),
			);
			return totals.reduce((sum, t) => sum + t, 0);
		}

		if (categoryIds.length > 0) {
			const totals = await Promise.all(
				categoryIds.map((categoryId) =>
					Analytics.getTotalHoursByCategoryAndDate(ctx, {
						userId,
						filters: { categoryId, dateRange },
					}),
				),
			);
			return totals.reduce((sum, t) => sum + t, 0);
		}

		return Analytics.getTotalHoursByDate(ctx, {
			userId,
			filters: { dateRange },
		});
	},
});

export const exportTimeEntries = query({
	args: {
		filters: v.optional(
			v.object({
				name: v.optional(v.string()),
				clientIds: v.optional(v.array(v.id("clients"))),
				projectIds: v.optional(v.array(v.id("projects"))),
				categoryIds: v.optional(v.array(v.id("categories"))),
				dateRange: v.optional(
					v.object({
						startDate: v.optional(v.number()),
						endDate: v.optional(v.number()),
					}),
				),
			}),
		),
	},
	handler: async (ctx, { filters }) => {
		const userId = await getRequiredUserId(ctx);
		return TimeEntries.getAllTimeEntries(ctx, { userId, filters });
	},
});

export const getRunningTimer = query({
	args: {},
	handler: async (ctx) => {
		const userId = await getRequiredUserId(ctx);
		return TimeEntries.getRunningTimer(ctx, { userId });
	},
});

export const getRecentProjects = query({
	args: {
		limit: v.optional(v.number()),
	},
	handler: async (ctx, { limit }) => {
		const userId = await getRequiredUserId(ctx);
		return TimeEntries.getRecentProjects(ctx, { userId, limit: limit ?? 5 });
	},
});
