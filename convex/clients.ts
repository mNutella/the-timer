import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

import { mutation, query } from "./functions";

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
