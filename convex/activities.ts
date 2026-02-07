import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation } from "./functions";

// export const create = mutation({
// 	args: {
// 		userId: v.id("users"),
// 		name: v.string(),
// 		description: v.optional(v.string()),
// 		clientId: v.optional(v.id("clients")),
// 		projectId: v.optional(v.id("projects")),
// 		categoryId: v.optional(v.id("categories")),
// 	},
// 	handler: async (
// 		ctx,
// 		{ userId, name, description, clientId, projectId, categoryId },
// 	) => {
// 		const now = Date.now();

// 		// Validate ownership of provided relations
// 		if (clientId) {
// 			const client = await ctx.table("clients").getX(clientId);
// 			if (client.userId !== userId) {
// 				throw new Error("Client does not belong to user");
// 			}
// 		}

// 		if (projectId) {
// 			const project = await ctx.table("projects").getX(projectId);
// 			if (project.userId !== userId) {
// 				throw new Error("Project does not belong to user");
// 			}
// 		}

// 		if (categoryId) {
// 			const category = await ctx.table("categories").getX(categoryId);
// 			if (category.userId !== userId) {
// 				throw new Error("Category does not belong to user");
// 			}
// 		}

// 		// Finish any unfinished time entry for this user
// 		const unfinished = await ctx
// 			.table("time_entries", "userId", (q) => q.eq("userId", userId))
// 			.filter((q) => q.eq(q.field("end_time"), undefined))
// 			.first();

// 		if (unfinished) {
// 			await unfinished.patch({
// 				end_time: now,
// 				duration: now - unfinished.start_time,
// 			});
// 		}

// 		// Create the activity
// 		const activityId = await ctx.table("activities").insert({
// 			name,
// 			description,
// 			userId,
// 			clientId,
// 			projectId,
// 			categoryId,
// 			updated_at: now,
// 		});

// 		// Start a new time entry for the created activity
// 		const timeEntryId = await ctx.table("time_entries").insert({
// 			userId,
// 			activityId,
// 			start_time: now,
// 			updated_at: now,
// 		});

// 		return { activityId, timeEntryId };
// 	},
// });

// export const updateName = mutation({
// 	args: {
// 		userId: v.id("users"),
// 		activityId: v.id("activities"),
// 		name: v.string(),
// 	},
// 	handler: async (ctx, { userId, activityId, name }) => {
// 		const activity = await ctx.table("activities").getX(activityId);

// 		if (activity.userId !== userId) {
// 			throw new Error("Activity does not belong to user");
// 		}

// 		await activity.patch({ name });
// 	},
// });

// export const updateClient = mutation({
// 	args: {
// 		userId: v.id("users"),
// 		activityId: v.id("activities"),
// 		clientId: v.optional(v.id("clients")),
// 		clientName: v.optional(v.string()),
// 	},
// 	handler: async (ctx, { userId, activityId, clientId, clientName }) => {
// 		const activity = await ctx.table("activities").getX(activityId);

// 		if (activity.userId !== userId) {
// 			throw new Error("Activity does not belong to user");
// 		}

// 		if (clientId && clientId === activity.clientId) {
// 			throw new Error("Client is already set");
// 		}

// 		if (!clientId && !clientName) {
// 			return await activity.patch({
// 				clientId: undefined,
// 				projectId: undefined,
// 			});
// 		}

// 		let newClientId: Id<"clients"> | undefined = clientId;

// 		if (clientId) {
// 			const newClient = await ctx.table("clients").getX(clientId);
// 			if (newClient.userId !== userId) {
// 				throw new Error("Client does not belong to user");
// 			}
// 		} else if (clientName) {
// 			const existingClient = await ctx
// 				.table("clients")
// 				.filter((q) =>
// 					q.and(
// 						q.eq(q.field("name"), clientName),
// 						q.eq(q.field("userId"), userId),
// 					),
// 				)
// 				.first();

// 			if (existingClient) {
// 				newClientId = existingClient._id;
// 			} else {
// 				newClientId = await ctx.table("clients").insert({
// 					name: clientName,
// 					userId,
// 					updated_at: Date.now(),
// 				});
// 			}
// 		}

// 		const currentProjectId = activity.projectId;

// 		if (currentProjectId) {
// 			const currentProject = await ctx.table("projects").getX(currentProjectId);

// 			if (currentProject.clientId !== newClientId) {
// 				return await activity.patch({
// 					clientId: newClientId,
// 					projectId: undefined,
// 				});
// 			}
// 		}

// 		return await activity.patch({ clientId: newClientId });
// 	},
// });

// export const updateProject = mutation({
// 	args: {
// 		userId: v.id("users"),
// 		activityId: v.id("activities"),
// 		projectId: v.optional(v.id("projects")),
// 		projectName: v.optional(v.string()),
// 	},
// 	handler: async (ctx, { userId, activityId, projectId, projectName }) => {
// 		const activity = await ctx.table("activities").getX(activityId);

// 		if (activity.userId !== userId) {
// 			throw new Error("Activity does not belong to user");
// 		}

// 		if (!projectId && !projectName) {
// 			return await activity.patch({
// 				projectId: undefined,
// 			});
// 		}

// 		if (projectId && projectId === activity.projectId) {
// 			throw new Error("Project is already set");
// 		}

// 		let newProjectId: Id<"projects"> | undefined = undefined;

// 		if (projectId) {
// 			const project = await ctx.table("projects").getX(projectId);
// 			if (project.userId !== userId) {
// 				throw new Error("Project does not belong to user");
// 			}
// 			newProjectId = projectId;
// 		} else if (projectName) {
// 			const existingProject = await ctx
// 				.table("projects")
// 				.filter((q) =>
// 					q.and(
// 						q.eq(q.field("name"), projectName),
// 						q.eq(q.field("userId"), userId),
// 					),
// 				)
// 				.first();

// 			if (existingProject) {
// 				newProjectId = existingProject._id;
// 			} else {
// 				const projectData = {
// 					name: projectName,
// 					userId,
// 					status: "active" as const,
// 					updated_at: Date.now(),
// 					clientId: activity.clientId,
// 				};
// 				newProjectId = await ctx.table("projects").insert(projectData);
// 			}
// 		}

// 		await activity.patch({ projectId: newProjectId });
// 	},
// });

// export const updateCategory = mutation({
// 	args: {
// 		userId: v.id("users"),
// 		activityId: v.id("activities"),
// 		categoryId: v.optional(v.id("categories")),
// 		categoryName: v.optional(v.string()),
// 	},
// 	handler: async (ctx, { userId, activityId, categoryId, categoryName }) => {
// 		const activity = await ctx.table("activities").getX(activityId);

// 		if (activity.userId !== userId) {
// 			throw new Error("Activity does not belong to user");
// 		}

// 		if (!categoryId && !categoryName) {
// 			return await activity.patch({
// 				categoryId: undefined,
// 			});
// 		}

// 		if (categoryId && categoryId === activity.categoryId) {
// 			throw new Error("Category is already set");
// 		}

// 		let newCategoryId: Id<"categories"> | undefined = categoryId;

// 		if (categoryId) {
// 			const category = await ctx.table("categories").getX(categoryId);
// 			if (category.userId !== userId) {
// 				throw new Error("Category does not belong to user");
// 			}
// 		} else if (categoryName) {
// 			const existingCategory = await ctx
// 				.table("categories")
// 				.filter((q) =>
// 					q.and(
// 						q.eq(q.field("name"), categoryName),
// 						q.eq(q.field("userId"), userId),
// 					),
// 				)
// 				.first();

// 			if (existingCategory) {
// 				newCategoryId = existingCategory._id;
// 			} else {
// 				const categoryData = {
// 					name: categoryName,
// 					userId,
// 					updated_at: Date.now(),
// 				};
// 				newCategoryId = await ctx.table("categories").insert(categoryData);
// 			}
// 		}

// 		await activity.patch({ categoryId: newCategoryId });
// 	},
// });
