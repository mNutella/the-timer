import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

import { timeEntriesTotalDurationByClientAndDateAggregate } from "./aggregates";
import { mutation, query } from "./functions";
import * as Clients from "./model/clients";
import { getEndOfDay, getStartOfDay } from "./utils";

export const create = mutation({
	args: {
		name: v.string(),
		userId: v.id("users"),
	},
	handler: async (ctx, params) => {
		return Clients.create(ctx, params);
	},
});

export const list = query({
	args: {
		userId: v.id("users"),
		dateRange: v.optional(
			v.object({
				startDate: v.number(),
				endDate: v.number(),
			}),
		),
	},
	handler: async (ctx, { userId, dateRange }) => {
		const lowerDate = dateRange ? getStartOfDay(dateRange.startDate) : 0;
		const upperDate = dateRange
			? getEndOfDay(dateRange.endDate)
			: Number.MAX_SAFE_INTEGER;

		const clients = await ctx
			.table("clients", "userId", (q) => q.eq("userId", userId))
			.map(async (client) => {
				const totalDuration =
					await timeEntriesTotalDurationByClientAndDateAggregate.sum(ctx, {
						namespace: userId,
						bounds: {
							lower: { key: [client._id, lowerDate], inclusive: true },
							upper: {
								key: [client._id, upperDate],
								inclusive: true,
							},
						},
					});

				const projects = await client.edge("projects");

				return {
					...client.doc(),
					totalDuration,
					projectCount: projects.length,
				};
			});

		return clients;
	},
});

export const update = mutation({
	args: {
		id: v.id("clients"),
		userId: v.id("users"),
		name: v.string(),
	},
	handler: async (ctx, params) => {
		await Clients.update(ctx, params);
	},
});

export const deleteOne = mutation({
	args: {
		id: v.id("clients"),
		userId: v.id("users"),
	},
	handler: async (ctx, params) => {
		await Clients.deleteOne(ctx, params);
	},
});

export const searchByName = query({
	args: {
		userId: v.id("users"),
		query: v.string(),
		paginationOpts: paginationOptsValidator,
	},
	handler: async (ctx, { userId, query, paginationOpts }) => {
		const trimmedQuery = query.trim();

		if (trimmedQuery === "") {
			const clients = await ctx
				.table("clients", "userId", (q) => q.eq("userId", userId))
				.paginate(paginationOpts);
			return clients;
		}

		const clients = await ctx
			.table("clients")
			.search("name", (q) =>
				q.search("name", trimmedQuery).eq("userId", userId),
			)
			.paginate(paginationOpts);

		return clients;
	},
});
