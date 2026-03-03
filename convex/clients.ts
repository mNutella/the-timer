import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

import { timeEntriesTotalDurationByClientAndDateAggregate } from "./aggregates";
import { mutation, query } from "./functions";
import { getRequiredUserId } from "./model/auth";
import * as Clients from "./model/clients";

export const create = mutation({
	args: {
		name: v.string(),
		hourly_rate_cents: v.optional(v.number()),
	},
	handler: async (ctx, { name, hourly_rate_cents }) => {
		const userId = await getRequiredUserId(ctx);
		return Clients.create(ctx, { name, userId, hourly_rate_cents });
	},
});

export const list = query({
	args: {
		dateRange: v.optional(
			v.object({
				startDate: v.number(),
				endDate: v.number(),
			}),
		),
	},
	handler: async (ctx, { dateRange }) => {
		const userId = await getRequiredUserId(ctx);
		const lowerDate = dateRange ? dateRange.startDate : 0;
		const upperDate = dateRange ? dateRange.endDate : Number.MAX_SAFE_INTEGER;

		const clients = await ctx
			.table("clients", "userId", (q) => q.eq("userId", userId))
			.map(async (client) => {
				const totalDuration = await timeEntriesTotalDurationByClientAndDateAggregate.sum(ctx, {
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
		name: v.optional(v.string()),
		hourly_rate_cents: v.optional(v.number()),
		clearHourlyRate: v.optional(v.boolean()),
	},
	handler: async (ctx, { id, name, hourly_rate_cents, clearHourlyRate }) => {
		const userId = await getRequiredUserId(ctx);
		await Clients.update(ctx, {
			id,
			userId,
			name,
			hourly_rate_cents: clearHourlyRate ? null : hourly_rate_cents,
		});
	},
});

export const deleteOne = mutation({
	args: {
		id: v.id("clients"),
	},
	handler: async (ctx, { id }) => {
		const userId = await getRequiredUserId(ctx);
		await Clients.deleteOne(ctx, { id, userId });
	},
});

export const searchByName = query({
	args: {
		query: v.string(),
		paginationOpts: paginationOptsValidator,
	},
	handler: async (ctx, { query, paginationOpts }) => {
		const userId = await getRequiredUserId(ctx);
		const trimmedQuery = query.trim();

		if (trimmedQuery === "") {
			const clients = await ctx
				.table("clients", "userId", (q) => q.eq("userId", userId))
				.paginate(paginationOpts);
			return clients;
		}

		const clients = await ctx
			.table("clients")
			.search("name", (q) => q.search("name", trimmedQuery).eq("userId", userId))
			.paginate(paginationOpts);

		return clients;
	},
});
