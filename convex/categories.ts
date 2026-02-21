import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

import { timeEntriesTotalDurationByCategoryAndDateAggregate } from "./aggregates";
import { mutation, query } from "./functions";
import * as Categories from "./model/categories";
import { getEndOfDay, getStartOfDay } from "./utils";

export const create = mutation({
	args: {
		name: v.string(),
		userId: v.id("users"),
	},
	handler: async (ctx, params) => {
		return Categories.create(ctx, params);
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

		const categories = await ctx
			.table("categories", "userId", (q) => q.eq("userId", userId))
			.map(async (category) => {
				const totalDuration =
					await timeEntriesTotalDurationByCategoryAndDateAggregate.sum(ctx, {
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
		userId: v.id("users"),
		name: v.string(),
	},
	handler: async (ctx, params) => {
		await Categories.update(ctx, params);
	},
});

export const deleteOne = mutation({
	args: {
		id: v.id("categories"),
		userId: v.id("users"),
	},
	handler: async (ctx, params) => {
		await Categories.deleteOne(ctx, params);
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
			const categories = await ctx
				.table("categories", "userId", (q) => q.eq("userId", userId))
				.paginate(paginationOpts);
			return categories;
		}

		const categories = await ctx
			.table("categories")
			.search("name", (q) =>
				q.search("name", trimmedQuery).eq("userId", userId),
			)
			.paginate(paginationOpts);

		return categories;
	},
});
