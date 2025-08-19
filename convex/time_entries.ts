import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { omit } from "convex-helpers";
import { Aggregate } from "@convex-dev/aggregate";

import type { Id } from "./_generated/dataModel";
import { components } from "./_generated/api";
import { mutation, query } from "./functions";

export const getAll = query({
	args: { paginationOpts: paginationOptsValidator, userId: v.id("users") },
	handler: async (ctx, { paginationOpts, userId }) => {
		const { page: timeEntries, ...restPagination } = await ctx
			.table("time_entries", "userId", (q) => q.eq("userId", userId))
			.order("desc")
			.paginate(paginationOpts);

		if (timeEntries.length === 0) {
			return { page: [], ...restPagination };
		}

		const finalPage = await Promise.all(
			timeEntries.map(async (timeEntry) => {
				const activity = await timeEntry.edgeX("activity");
				const [client, project, category, tags] = await Promise.all([
					activity.edge("client"),
					activity.edge("project"),
					activity.edge("category"),
					activity.edge("tags"),
				]);

				return {
					...omit(timeEntry, ["userId", "activityId"]),
					activity: {
						...omit(activity, [
							"userId",
							"clientId",
							"projectId",
							"categoryId",
						]),
						client: client ? omit(client, ["userId"]) : null,
						project: project ? omit(project, ["userId", "clientId"]) : null,
						category: category ? omit(category, ["userId"]) : null,
						tags: tags.map((tag) => omit(tag, ["userId"])),
					},
				};
			}),
		);

		return { ...restPagination, page: finalPage };
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

export const create = mutation({
	args: {
		userId: v.id("users"),
		activityId: v.id("activities"),
	},
	handler: async (ctx, { userId, activityId }) => {
		const activity = await ctx.table("activities").getX(activityId);
		if (activity.userId !== userId) {
			throw new Error("Activity does not belong to user");
		}

		const unfinished = await ctx
			.table("time_entries", "userId", (q) => q.eq("userId", userId))
			.filter((q) => q.eq(q.field("end_time"), undefined))
			.first();

		const now = Date.now();

		if (unfinished) {
			await unfinished.patch({
				end_time: now,
				duration: now - unfinished.start_time,
			});
		}

		const timeEntryId = await ctx.table("time_entries").insert({
			userId: userId,
			activityId: activityId,
			start_time: now,
			updated_at: now,
		});

		return timeEntryId;
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
			duration: now - timeEntry.start_time,
			updated_at: now,
		});

		return id;
	},
});

export const updateStartEndTime = mutation({
	args: {
		id: v.id("time_entries"),
		userId: v.id("users"),
		startDate: v.number(),
		endDate: v.number(),
	},
	handler: async (ctx, { userId, id, startDate, endDate }) => {
		const time_entry = await ctx.table("time_entries").getX(id);

		if (time_entry.userId !== userId) {
			throw new Error("Activity does not belong to user");
		}

		await time_entry.patch({
			start_time: startDate,
			end_time: endDate,
			duration: endDate - startDate,
		});
	},
});

export const updateDuration = mutation({
	args: {
		id: v.id("time_entries"),
		userId: v.id("users"),
		duration: v.number(),
	},
	handler: async (ctx, { userId, id, duration }) => {
		const time_entry = await ctx.table("time_entries").getX(id);

		if (time_entry.userId !== userId) {
			throw new Error("Activity does not belong to user");
		}

		await time_entry.patch({
			duration,
			end_time: time_entry.start_time + duration,
		});
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
