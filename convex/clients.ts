import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

import { timeEntriesTotalDurationByClientAndDateAggregate } from "./aggregates";
import { mutation, query } from "./functions";
import { getEndOfDay, getStartOfDay } from "./utils";

export const create = mutation({
	args: {
		name: v.string(),
		userId: v.id("users"),
	},
	handler: async (ctx, { name, userId }) => {
		const clientId = await ctx.table("clients").insert({
			name,
			userId,
			updated_at: Date.now(),
		});

		return clientId;
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
	handler: async (ctx, { id, userId, name }) => {
		const client = await ctx.table("clients").getX(id);

		if (client.userId !== userId) {
			throw new Error("Client does not belong to user");
		}

		await client.patch({ name, updated_at: Date.now() });
	},
});

export const deleteOne = mutation({
	args: {
		id: v.id("clients"),
		userId: v.id("users"),
	},
	handler: async (ctx, { id, userId }) => {
		const client = await ctx.table("clients").getX(id);

		if (client.userId !== userId) {
			throw new Error("Client does not belong to user");
		}

		// Nullify clientId on linked time entries
		const timeEntries = await ctx.table(
			"time_entries",
			"by_user_and_client",
			(q) => q.eq("userId", userId).eq("clientId", id),
		);

		for (const entry of timeEntries) {
			await entry.patch({ clientId: undefined, updated_at: Date.now() });
		}

		// Nullify clientId on linked projects
		const projects = await ctx.table("projects", "by_user_and_client", (q) =>
			q.eq("userId", userId).eq("clientId", id),
		);

		for (const project of projects) {
			await project.patch({ clientId: undefined, updated_at: Date.now() });
		}

		await client.delete();
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
