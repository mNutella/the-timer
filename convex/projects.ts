import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

import { timeEntriesTotalDurationByProjectAndDateAggregate } from "./aggregates";
import { mutation, query } from "./functions";
import { getEndOfDay, getStartOfDay } from "./utils";

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
	handler: async (
		ctx,
		{ id, userId, name, status, clientId, clearClientId },
	) => {
		const project = await ctx.table("projects").getX(id);

		if (project.userId !== userId) {
			throw new Error("Project does not belong to user");
		}

		const updates: Record<string, unknown> = { updated_at: Date.now() };
		if (name !== undefined) updates.name = name;
		if (status !== undefined) updates.status = status;
		if (clearClientId) {
			updates.clientId = undefined;
		} else if (clientId !== undefined) {
			updates.clientId = clientId;
		}

		await project.patch(updates);
	},
});

export const deleteOne = mutation({
	args: {
		id: v.id("projects"),
		userId: v.id("users"),
	},
	handler: async (ctx, { id, userId }) => {
		const project = await ctx.table("projects").getX(id);

		if (project.userId !== userId) {
			throw new Error("Project does not belong to user");
		}

		// Nullify projectId on linked time entries
		const timeEntries = await ctx.table(
			"time_entries",
			"by_user_and_project",
			(q) => q.eq("userId", userId).eq("projectId", id),
		);

		for (const entry of timeEntries) {
			await entry.patch({ projectId: undefined, updated_at: Date.now() });
		}

		await project.delete();
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
