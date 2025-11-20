import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./functions";
import { getEndOfDay, getStartOfDay } from "./utils";
import * as Analytics from "./model/analytics";
import * as TimeEntries from "./model/time_entries";

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
				clientId: v.optional(v.id("clients")),
				projectId: v.optional(v.id("projects")),
				categoryId: v.optional(v.id("categories")),
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

export const getTotalDuration = query({
	args: {
		userId: v.id("users"),
		filters: v.optional(
			v.object({
				name: v.optional(v.string()),
				clientId: v.optional(v.id("clients")),
				projectId: v.optional(v.id("projects")),
				categoryId: v.optional(v.id("categories")),
				dateRange: v.object({
					startDate: v.number(),
					endDate: v.number(),
				}),
			}),
		),
	},
	handler: async (ctx, { userId, filters }) => {
		const { startDate, endDate } = filters?.dateRange ?? {};
		const isMoreThanOneFilter =
			[
				filters?.name,
				filters?.clientId,
				filters?.projectId,
				filters?.categoryId,
			].filter(Boolean).length > 1;
		let totalDuration = 0;

		if (isMoreThanOneFilter) {
			// TODO: Handle multiple filters
		}

		if (filters?.clientId) {
			totalDuration = await Analytics.getTotalHoursByClientAndDate(ctx, {
				userId,
				filters: {
					clientId: filters?.clientId as Id<"clients">,
					dateRange: {
						startDate: getStartOfDay(startDate ?? 0),
						endDate: getEndOfDay(endDate ?? 0),
					},
				},
			});
			return totalDuration;
		}

		if (filters?.projectId) {
			totalDuration = await Analytics.getTotalHoursByProjectAndDate(ctx, {
				userId,
				filters: {
					projectId: filters?.projectId as Id<"projects">,
					dateRange: {
						startDate: getStartOfDay(startDate ?? 0),
						endDate: getEndOfDay(endDate ?? 0),
					},
				},
			});
			return totalDuration;
		}

		if (filters?.categoryId) {
			totalDuration = await Analytics.getTotalHoursByCategoryAndDate(ctx, {
				userId,
				filters: {
					categoryId: filters?.categoryId as Id<"categories">,
					dateRange: {
						startDate: getStartOfDay(startDate ?? 0),
						endDate: getEndOfDay(endDate ?? 0),
					},
				},
			});
			return totalDuration;
		}

		totalDuration = await Analytics.getTotalHoursByDate(ctx, {
			userId,
			filters: {
				dateRange: {
					startDate: getStartOfDay(startDate ?? 0),
					endDate: getEndOfDay(endDate ?? 0),
				},
			},
		});

		return totalDuration;
	},
});
