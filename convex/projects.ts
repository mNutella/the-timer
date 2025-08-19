import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

import { mutation, query } from "./functions";

// TODO: remake this logic. Make it as internal mutation and use it time_entries use it here for create a project.
// In time_entries we need to use this mutation to create and update an activity linked to a new project.
export const create = mutation({
	args: {
		name: v.string(),
		userId: v.id("users"),
		clientId: v.optional(v.id("clients")),
	},
	handler: async (ctx, { name, userId, clientId }) => {
		// Check if user has access to client if clientId is provided
		if (clientId) {
			const client = await ctx.table("clients").getX(clientId);
			if (client.userId !== userId) {
				throw new Error("User does not have access to this client");
			}
		}

		const projectData: any = {
			name,
			userId,
			status: "active",
			updated_at: Date.now(),
			clientId,
		};
		const projectId = await ctx.table("projects").insert(projectData);

		return projectId;
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
