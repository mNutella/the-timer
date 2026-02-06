import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

import { mutation, query } from "./functions";
import * as Analytics from "./model/analytics";
import * as TimeEntries from "./model/time_entries";
import { getEndOfDay, getStartOfDay } from "./utils";

export const create = mutation({
	args: {
		userId: v.id("users"),
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
		const timeEntryId = await TimeEntries.create(ctx, params);

		return timeEntryId;
	},
});

export const stop = mutation({
	args: {
		id: v.id("time_entries"),
		userId: v.id("users"),
	},
	handler: async (ctx, params) => {
		const timeEntry = await TimeEntries.stop(ctx, params);

		return timeEntry._id;
	},
});

export const update = mutation({
	args: {
		id: v.id("time_entries"),
		userId: v.id("users"),
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
		await TimeEntries.update(ctx, params);
	},
});

export const deleteOne = mutation({
	args: {
		id: v.id("time_entries"),
		userId: v.id("users"),
	},
	handler: async (ctx, params) => {
		await TimeEntries.deleteOne(ctx, params);
	},
});

export const updateClient = mutation({
	args: {
		timeEntryId: v.id("time_entries"),
		userId: v.id("users"),
		clientId: v.optional(v.id("clients")),
		newClientName: v.optional(v.string()),
	},
	handler: async (ctx, params) => {
		const timeEntry = await TimeEntries.updateClient(ctx, params);

		return timeEntry._id;
	},
});

export const updateProject = mutation({
	args: {
		timeEntryId: v.id("time_entries"),
		userId: v.id("users"),
		projectId: v.optional(v.id("projects")),
		newProjectName: v.optional(v.string()),
	},
	handler: async (ctx, params) => {
		const timeEntry = await TimeEntries.updateProject(ctx, params);

		return timeEntry._id;
	},
});

export const updateCategory = mutation({
	args: {
		timeEntryId: v.id("time_entries"),
		userId: v.id("users"),
		categoryId: v.optional(v.id("categories")),
		newCategoryName: v.optional(v.string()),
	},
	handler: async (ctx, params) => {
		const timeEntry = await TimeEntries.updateCategory(ctx, params);

		return timeEntry._id;
	},
});

export const searchTimeEntries = query({
	args: {
		userId: v.id("users"),
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
		paginationOpts: paginationOptsValidator,
	},
	handler: async (ctx, { userId, filters, paginationOpts }) => {
		const timeEntries = await TimeEntries.searchTimeEntries(ctx, {
			userId,
			filters,
			paginationOpts,
		});

		return timeEntries;
	},
});

export const getDailyDurations = query({
	args: {
		userId: v.id("users"),
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
	handler: async (ctx, { userId, filters }) => {
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

export const getCategoryBreakdown = query({
	args: {
		userId: v.id("users"),
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
		{ userId, clientIds, projectIds, categoryIds, dateRange },
	) => {
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
		userId: v.id("users"),
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
	handler: async (ctx, { userId, filters }) => {
		const { startDate, endDate } = filters?.dateRange ?? {};
		const dateRange = {
			startDate: getStartOfDay(startDate ?? 0),
			endDate: getEndOfDay(endDate ?? 0),
		};

		const clientIds = filters?.clientIds ?? [];
		const projectIds = filters?.projectIds ?? [];
		const categoryIds = filters?.categoryIds ?? [];

		if (clientIds.length > 0) {
			let total = 0;
			for (const clientId of clientIds) {
				total += await Analytics.getTotalHoursByClientAndDate(ctx, {
					userId,
					filters: { clientId, dateRange },
				});
			}
			return total;
		}

		if (projectIds.length > 0) {
			let total = 0;
			for (const projectId of projectIds) {
				total += await Analytics.getTotalHoursByProjectAndDate(ctx, {
					userId,
					filters: { projectId, dateRange },
				});
			}
			return total;
		}

		if (categoryIds.length > 0) {
			let total = 0;
			for (const categoryId of categoryIds) {
				total += await Analytics.getTotalHoursByCategoryAndDate(ctx, {
					userId,
					filters: { categoryId, dateRange },
				});
			}
			return total;
		}

		return Analytics.getTotalHoursByDate(ctx, {
			userId,
			filters: { dateRange },
		});
	},
});
