import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

import { timeEntriesTotalDurationByProjectAndDateAggregate } from "./aggregates";
import { mutation, query } from "./functions";
import { getRequiredUserId } from "./model/auth";
import * as Projects from "./model/projects";
import { getEndOfDay, getStartOfDay } from "./utils";

export const create = mutation({
	args: {
		name: v.string(),
		clientId: v.optional(v.id("clients")),
		hourly_rate_cents: v.optional(v.number()),
	},
	handler: async (ctx, { name, clientId, hourly_rate_cents }) => {
		const userId = await getRequiredUserId(ctx);
		return Projects.create(ctx, { name, userId, clientId, hourly_rate_cents });
	},
});

export const list = query({
	args: {
		clientId: v.optional(v.id("clients")),
		dateRange: v.optional(
			v.object({
				startDate: v.number(),
				endDate: v.number(),
			}),
		),
	},
	handler: async (ctx, { clientId, dateRange }) => {
		const userId = await getRequiredUserId(ctx);
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
		hourly_rate_cents: v.optional(v.number()),
		clearHourlyRate: v.optional(v.boolean()),
	},
	handler: async (ctx, { id, clearHourlyRate, ...rest }) => {
		const userId = await getRequiredUserId(ctx);
		await Projects.update(ctx, {
			id,
			userId,
			...rest,
			hourly_rate_cents: clearHourlyRate ? null : rest.hourly_rate_cents,
		});
	},
});

export const deleteOne = mutation({
	args: {
		id: v.id("projects"),
	},
	handler: async (ctx, { id }) => {
		const userId = await getRequiredUserId(ctx);
		await Projects.deleteOne(ctx, { id, userId });
	},
});

export const searchByName = query({
	args: {
		query: v.string(),
		paginationOpts: paginationOptsValidator,
		clientId: v.optional(v.id("clients")),
	},
	handler: async (ctx, { query, paginationOpts, clientId }) => {
		const userId = await getRequiredUserId(ctx);
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
