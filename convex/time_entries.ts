import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { omit } from "convex-helpers";
import { Aggregate } from "@convex-dev/aggregate";

import type { Id } from "./_generated/dataModel";
import { components } from "./_generated/api";
import { mutation, query } from "./functions";
import type { Ent, EntQuery } from "./types";
import { computeNextTiming, updateIfDefined } from "./utils";

export const create = mutation({
	args: {
		userId: v.id("users"),
		name: v.string(),
		description: v.optional(v.string()),
		notes: v.optional(v.string()),
		categoryId: v.optional(v.id("categories")),
		projectId: v.optional(v.id("projects")),
		clientId: v.optional(v.id("clients")),
		tags: v.optional(v.array(v.id("tags"))),
		timeEntryId: v.optional(v.id("time_entries")),
	},
	handler: async (
		ctx,
		{
			userId,
			name,
			description,
			notes,
			categoryId,
			projectId,
			clientId,
			tags,
			timeEntryId,
		},
	) => {
		let existingTimeEntry:
			| (Omit<Ent<"time_entries">, "clientId" | "projectId" | "categoryId"> & {
					client: Ent<"clients"> | null;
					project: Ent<"projects"> | null;
					category: Ent<"categories"> | null;
					tags: Ent<"tags">[];
			  })
			| null = null;

		if (timeEntryId) {
			const timeEntry = await ctx.table("time_entries").getX(timeEntryId);
			if (timeEntry?.userId !== userId) {
				throw new Error("Time entry does not belong to user");
			}

			const [client, project, category, tags] = await Promise.all([
				timeEntry.edge("client"),
				timeEntry.edge("project"),
				timeEntry.edge("category"),
				timeEntry.edge("tags"),
			]);
			existingTimeEntry = {
				...omit(timeEntry, ["clientId", "projectId", "categoryId"]),
				client,
				project,
				category,
				tags,
			};
		}

		const unfinishedTimeEntry = await ctx
			.table("time_entries", "by_user_end_time", (q) =>
				q.eq("userId", userId).eq("end_time", undefined),
			)
			.first();

		const now = Date.now();

		if (unfinishedTimeEntry) {
			await unfinishedTimeEntry.patch({
				end_time: now,
				duration: now - (unfinishedTimeEntry?.start_time ?? 0),
			});
		}

		const newTimeEntryId = await ctx.table("time_entries").insert({
			name: existingTimeEntry?.name ?? name,
			description: existingTimeEntry?.description ?? description,
			notes: existingTimeEntry?.notes ?? notes,
			userId: userId,
			clientId: existingTimeEntry?.client?._id ?? clientId,
			projectId: existingTimeEntry?.project?._id ?? projectId,
			categoryId: existingTimeEntry?.category?._id ?? categoryId,
			tags: existingTimeEntry?.tags?.map((tag) => tag._id) ?? tags,
			start_time: now,
			updated_at: now,
		});

		return newTimeEntryId;
	},
});

export const stop = mutation({
	args: {
		id: v.id("time_entries"),
		userId: v.id("users"),
	},
	handler: async (ctx, { id, userId }) => {
		const timeEntry = await ctx.table("time_entries").getX(id);

		if (timeEntry.userId !== userId) {
			throw new Error("Activity does not belong to user");
		}

		if (timeEntry.end_time !== undefined) {
			return id;
		}

		const now = Date.now();
		await timeEntry.patch({
			end_time: now,
			duration: now - (timeEntry?.start_time ?? 0),
			updated_at: now,
		});

		return id;
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
	handler: async (
		ctx,
		{
			userId,
			id,
			name,
			description,
			notes,
			categoryId,
			projectId,
			clientId,
			tagIds,
			startDate,
			endDate,
			duration,
		},
	) => {
		const timeEntry = await ctx.table("time_entries").getX(id);

		if (timeEntry.userId !== userId) {
			throw new Error("Activity does not belong to user");
		}

		const updateTimeEntry: Partial<Ent<"time_entries">> = {};

		updateIfDefined(updateTimeEntry, {
			name,
			description,
			notes,
			clientId,
			projectId,
			categoryId,
		});

		if (duration || startDate || endDate) {
			const {
				start_time,
				end_time,
				duration: nextDuration,
			} = computeNextTiming({
				currentStart: timeEntry.start_time,
				currentEnd: timeEntry.end_time,
				startDate,
				endDate,
				duration,
			});
			updateIfDefined(updateTimeEntry, {
				start_time,
				end_time,
				duration: nextDuration,
			});
		}

		updateTimeEntry.updated_at = Date.now();

		await timeEntry.patch(updateTimeEntry);
	},
});

export const deleteOne = mutation({
	args: {
		id: v.id("time_entries"),
		userId: v.id("users"),
	},
	handler: async (ctx, { userId, id }) => {
		const time_entry = await ctx.table("time_entries").getX(id);

		if (!time_entry) {
			throw new Error("Time entry not found");
		}

		if (time_entry.userId !== userId) {
			throw new Error("Activity does not belong to user");
		}

		await time_entry.delete();
	},
});

export const updateClient = mutation({
	args: {
		timeEntryId: v.id("time_entries"),
		userId: v.id("users"),
		clientId: v.optional(v.id("clients")),
		newClientName: v.optional(v.string()),
	},
	handler: async (ctx, { timeEntryId, userId, clientId, newClientName }) => {
		const timeEntry = await ctx.table("time_entries").getX(timeEntryId);

		if (timeEntry.userId !== userId) {
			throw new Error("Time entry does not belong to user");
		}

		if (clientId && newClientName) {
			throw new Error("Provide exactly one of clientId or newClientName");
		}

		let nextClientId = clientId;

		if (!nextClientId && newClientName) {
			const normalized = newClientName.trim();
			if (!normalized) {
				throw new Error("Client name cannot be empty");
			}

			const existingClient = await ctx
				.table("clients")
				.search("name", (q) =>
					q.search("name", normalized).eq("userId", userId),
				)
				.first();

			if (
				existingClient &&
				existingClient.name.toLowerCase() === normalized.toLowerCase()
			) {
				nextClientId = existingClient._id;
			} else {
				nextClientId = await ctx.table("clients").insert({
					name: normalized,
					userId,
					updated_at: Date.now(),
				});
			}
		}

		let currentProject: Ent<"projects"> | null = null;
		if (timeEntry.projectId) {
			currentProject = await ctx.table("projects").get(timeEntry.projectId);
		}

		await timeEntry.patch({
			clientId: nextClientId,
			projectId:
				nextClientId === undefined
					? timeEntry.projectId
					: currentProject?.clientId === nextClientId
						? timeEntry.projectId
						: undefined,
			updated_at: Date.now(),
		});

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
	handler: async (ctx, { timeEntryId, userId, projectId, newProjectName }) => {
		const timeEntry = await ctx.table("time_entries").getX(timeEntryId);

		if (timeEntry.userId !== userId) {
			throw new Error("Time entry does not belong to user");
		}

		if (projectId && newProjectName) {
			throw new Error("Provide exactly one of projectId or newProjectName");
		}

		let nextProjectId = projectId;

		if (!nextProjectId && newProjectName) {
			const normalized = newProjectName.trim();
			if (!normalized) {
				throw new Error("Client name cannot be empty");
			}

			const existingProject = await ctx
				.table("projects")
				.search("name", (q) =>
					q.search("name", normalized).eq("userId", userId),
				)
				.first();

			if (
				existingProject &&
				existingProject.name.toLowerCase() === normalized.toLowerCase()
			) {
				nextProjectId = existingProject._id;
			} else {
				nextProjectId = await ctx.table("projects").insert({
					name: normalized,
					userId,
					clientId: timeEntry.clientId,
					status: "active",
					updated_at: Date.now(),
				});
			}
		}

		await timeEntry.patch({ projectId: nextProjectId, updated_at: Date.now() });

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
	handler: async (
		ctx,
		{ timeEntryId, userId, categoryId, newCategoryName },
	) => {
		const timeEntry = await ctx.table("time_entries").getX(timeEntryId);

		if (timeEntry.userId !== userId) {
			throw new Error("Time entry does not belong to user");
		}

		if (categoryId && newCategoryName) {
			throw new Error("Provide exactly one of categoryId or newCategoryName");
		}

		let nextCategoryId = categoryId;

		if (!nextCategoryId && newCategoryName) {
			const normalized = newCategoryName.trim();
			if (!normalized) {
				throw new Error("Client name cannot be empty");
			}

			const existingCategory = await ctx
				.table("categories")
				.search("name", (q) =>
					q.search("name", normalized).eq("userId", userId),
				)
				.first();

			if (
				existingCategory &&
				existingCategory.name.toLowerCase() === normalized.toLowerCase()
			) {
				nextCategoryId = existingCategory._id;
			} else {
				nextCategoryId = await ctx.table("categories").insert({
					name: normalized,
					userId,
					updated_at: Date.now(),
				});
			}
		}

		await timeEntry.patch({
			categoryId: nextCategoryId,
			updated_at: Date.now(),
		});

		return timeEntry._id;
	},
});

export const getAllTotalCount = query({
	args: { userId: v.id("users") },
	handler: async (ctx, { userId }) => {
		const agg = new Aggregate<null, string, Id<"users">>(components.aggregate);
		const totalCount = await agg.count(ctx, { namespace: userId });
		return totalCount;
	},
});

export const getAllWithFilters = query({
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
		let timeEntries: EntQuery<"time_entries"> | null = null;

		const nameQuery = (filters?.name ?? "").trim();
		const hasName = nameQuery.length > 0;
		const { startDate, endDate } = filters?.dateRange ?? {};

		if (hasName) {
			timeEntries = ctx.table("time_entries").search("name", (q) => {
				let s = q.search("name", nameQuery).eq("userId", userId);

				if (filters?.clientId) s = s.eq("clientId", filters?.clientId);
				if (filters?.projectId) s = s.eq("projectId", filters?.projectId);
				if (filters?.categoryId) s = s.eq("categoryId", filters?.categoryId);

				return s;
			});
		} else if (startDate !== undefined) {
			timeEntries = ctx
				.table("time_entries", "by_user_start_time", (q) =>
					q.eq("userId", userId).gte("start_time", startDate),
				)
				.order("desc");
		} else if (endDate !== undefined) {
			timeEntries = ctx
				.table("time_entries", "by_user_end_time", (q) =>
					q.eq("userId", userId).lte("end_time", endDate),
				)
				.order("desc");
		} else if (filters?.clientId) {
			timeEntries = ctx
				.table("time_entries", "by_user_and_client", (q) =>
					q.eq("userId", userId).eq("clientId", filters.clientId),
				)
				.order("desc");
		} else if (filters?.projectId) {
			timeEntries = ctx
				.table("time_entries", "by_user_and_project", (q) =>
					q.eq("userId", userId).eq("projectId", filters.projectId),
				)
				.order("desc");
		} else if (filters?.categoryId) {
			timeEntries = ctx
				.table("time_entries", "by_user_and_category", (q) =>
					q.eq("userId", userId).eq("categoryId", filters.categoryId),
				)
				.order("desc");
		} else {
			timeEntries = ctx
				.table("time_entries", "userId", (q) => q.eq("userId", userId))
				.order("desc");
		}

		// Apply remaining filters without requiring composite indexes
		if (!hasName) {
			if (filters?.projectId) {
				// already covered by index when chosen; if a different index used, filter here
				timeEntries = timeEntries.filter((q) =>
					q.eq(q.field("projectId"), filters.projectId),
				);
			}
			if (filters?.clientId) {
				timeEntries = timeEntries.filter((q) =>
					q.eq(q.field("clientId"), filters.clientId),
				);
			}
			if (filters?.categoryId) {
				timeEntries = timeEntries.filter((q) =>
					q.eq(q.field("categoryId"), filters.categoryId),
				);
			}
		}

		if (startDate !== undefined) {
			timeEntries = timeEntries.filter((q) =>
				q.gte(q.field("start_time"), startDate),
			);
		}

		if (endDate !== undefined) {
			timeEntries = timeEntries.filter((q) =>
				q.lte(q.field("end_time"), endDate),
			);
		}

		if (!timeEntries) {
			return { page: [], continueCursor: "", isDone: true };
		}

		const { page: paginatedTimeEntries, ...restPagination } =
			await timeEntries.paginate(paginationOpts);

		const finalPage = await Promise.all(
			paginatedTimeEntries.map(async (timeEntry) => {
				const [client, project, category, tags] = await Promise.all([
					timeEntry.edge("client"),
					timeEntry.edge("project"),
					timeEntry.edge("category"),
					timeEntry.edge("tags"),
				]);
				return {
					...omit(timeEntry, ["userId"]),
					client: client ? omit(client, ["userId"]) : null,
					project: project ? omit(project, ["userId", "clientId"]) : null,
					category: category ? omit(category, ["userId"]) : null,
					tags: tags.map((tag) => omit(tag, ["userId"])),
				};
			}),
		);

		return {
			page: finalPage,
			...restPagination,
		};
	},
});
