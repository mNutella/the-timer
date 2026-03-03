import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

import { timeEntriesTotalDurationByCategoryAndDateAggregate } from "./aggregates";
import { mutation, query } from "./functions";
import { getRequiredUserId } from "./model/auth";
import * as Categories from "./model/categories";

export const create = mutation({
	args: {
		name: v.string(),
	},
	handler: async (ctx, { name }) => {
		const userId = await getRequiredUserId(ctx);
		return Categories.create(ctx, { name, userId });
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

		const categories = await ctx
			.table("categories", "userId", (q) => q.eq("userId", userId))
			.map(async (category) => {
				const totalDuration = await timeEntriesTotalDurationByCategoryAndDateAggregate.sum(ctx, {
					namespace: userId,
					bounds: {
						lower: { key: [category._id, lowerDate], inclusive: true },
						upper: {
							key: [category._id, upperDate],
							inclusive: true,
						},
					},
				});

				return {
					...category.doc(),
					totalDuration,
				};
			});

		return categories;
	},
});

export const update = mutation({
	args: {
		id: v.id("categories"),
		name: v.string(),
	},
	handler: async (ctx, { id, name }) => {
		const userId = await getRequiredUserId(ctx);
		await Categories.update(ctx, { id, userId, name });
	},
});

export const deleteOne = mutation({
	args: {
		id: v.id("categories"),
	},
	handler: async (ctx, { id }) => {
		const userId = await getRequiredUserId(ctx);
		await Categories.deleteOne(ctx, { id, userId });
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
			const categories = await ctx
				.table("categories", "userId", (q) => q.eq("userId", userId))
				.paginate(paginationOpts);
			return categories;
		}

		const categories = await ctx
			.table("categories")
			.search("name", (q) => q.search("name", trimmedQuery).eq("userId", userId))
			.paginate(paginationOpts);

		return categories;
	},
});
