import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

import { timeEntriesTotalDurationByProjectAndDateAggregate } from "./aggregates";
import { mutation, query } from "./functions";
import * as Projects from "./model/projects";
import { getEndOfDay, getStartOfDay } from "./utils";

export const create = mutation({
	args: {
		name: v.string(),
		userId: v.id("users"),
		clientId: v.optional(v.id("clients")),
	},
	handler: async (ctx, params) => {
		return Projects.create(ctx, params);
	},
});

export const list = query({
	args: {
		userId: v.id("users"),
		clientId: v.optional(v.id("clients")),
		dateRange: v.optional(
			v.object({
				startDate: v.number(),
				endDate: v.number(),
			}),
		),
	},
	handler: async (ctx, { userId, clientId, dateRange }) => {
		const lowerDate = dateRange ? getStartOfDay(dateRange.startDate) : 0;
		const upperDate = dateRange
			? getEndOfDay(dateRange.endDate)
			: Number.MAX_SAFE_INTEGER;

		const projectsQuery = clientId
			? ctx.table("projects", "by_user_and_client", (q) =>
					q.eq("userId", userId).eq("clientId", clientId),
				)
			: ctx.table("projects", "userId", (q) => q.eq("userId", userId));

		const projects = await projectsQuery.map(async (project) => {
			const totalDuration =
				await timeEntriesTotalDurationByProjectAndDateAggregate.sum(ctx, {
					namespace: userId,
					bounds: {
						lower: { key: [project._id, lowerDate], inclusive: true },
						upper: {
							key: [project._id, upperDate],
							inclusive: true,
						},
					},
				});

			const client = project.clientId
				? await ctx.table("clients").get(project.clientId)
				: null;

			return {
				...project.doc(),
				totalDuration,
				clientName: client?.name ?? null,
			};
		});

		return projects;
	},
});

export const update = mutation({
	args: {
		id: v.id("projects"),
		userId: v.id("users"),
		name: v.optional(v.string()),
		status: v.optional(
			v.union(
				v.literal("active"),
				v.literal("archived"),
				v.literal("completed"),
			),
		),
		clientId: v.optional(v.id("clients")),
		clearClientId: v.optional(v.boolean()),
	},
	handler: async (ctx, params) => {
		await Projects.update(ctx, params);
	},
});

export const deleteOne = mutation({
	args: {
		id: v.id("projects"),
		userId: v.id("users"),
	},
	handler: async (ctx, params) => {
		await Projects.deleteOne(ctx, params);
	},
});

export const searchByName = query({
	args: {
		userId: v.id("users"),
		query: v.string(),
		paginationOpts: paginationOptsValidator,
		clientId: v.optional(v.id("clients")),
	},
	handler: async (ctx, { userId, query, paginationOpts, clientId }) => {
		const trimmedQuery = query.trim();

		if (trimmedQuery === "" && !clientId) {
			const projects = await ctx
				.table("projects", "userId", (q) => q.eq("userId", userId))
				.paginate(paginationOpts);
			return projects;
		}

		if (!trimmedQuery && clientId) {
			const projects = await ctx
				.table("projects", "by_user_and_client", (q) =>
					q.eq("userId", userId).eq("clientId", clientId),
				)
				.paginate(paginationOpts);

			return projects;
		}

		if (clientId) {
			const projects = await ctx
				.table("projects")
				.search("name", (q) =>
					q
						.search("name", trimmedQuery)
						.eq("userId", userId)
						.eq("clientId", clientId),
				)
				.paginate(paginationOpts);

			return projects;
		}

		const projects = await ctx
			.table("projects")
			.search("name", (q) =>
				q.search("name", trimmedQuery).eq("userId", userId),
			)
			.paginate(paginationOpts);

		return projects;
	},
});
