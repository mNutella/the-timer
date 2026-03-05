import { v } from "convex/values";

import {
	timeEntriesTotalDurationByDateAggregate,
	timeEntriesTotalDurationByClientAndDateAggregate,
	timeEntriesTotalDurationByProjectAndDateAggregate,
	timeEntriesTotalDurationByCategoryAndDateAggregate,
} from "./aggregates";
import { internalQuery } from "./functions";

export const compareAggregatesToActual = internalQuery({
	args: {
		userId: v.id("users"),
		startDate: v.number(),
		endDate: v.number(),
	},
	handler: async (ctx, { userId, startDate, endDate }) => {
		// Sum from actual documents
		const entries = await ctx.table("time_entries", "by_user_start_time", (q) =>
			q.eq("userId", userId).gte("start_time", startDate).lte("start_time", endDate),
		);

		let actualTotal = 0;
		let entryCount = 0;
		for (const entry of entries) {
			if (entry.duration) {
				actualTotal += entry.duration;
				entryCount++;
			}
		}

		// Sum from byDate aggregate
		const aggregateTotal = await timeEntriesTotalDurationByDateAggregate.sum(ctx, {
			namespace: userId,
			bounds: {
				lower: { key: [startDate], inclusive: true },
				upper: { key: [endDate], inclusive: true },
			},
		});

		// Sum from byClient aggregate (all clients)
		const aggregateByClientTotal = await timeEntriesTotalDurationByClientAndDateAggregate.sum(ctx, {
			namespace: userId,
			bounds: {
				lower: { key: ["", startDate], inclusive: true },
				upper: { key: ["\uffff", endDate], inclusive: true },
			},
		});

		// Sum from byProject aggregate
		const aggregateByProjectTotal = await timeEntriesTotalDurationByProjectAndDateAggregate.sum(
			ctx,
			{
				namespace: userId,
				bounds: {
					lower: { key: ["", startDate], inclusive: true },
					upper: { key: ["\uffff", endDate], inclusive: true },
				},
			},
		);

		// Sum from byCategory aggregate
		const aggregateByCategoryTotal = await timeEntriesTotalDurationByCategoryAndDateAggregate.sum(
			ctx,
			{
				namespace: userId,
				bounds: {
					lower: { key: ["", startDate], inclusive: true },
					upper: { key: ["\uffff", endDate], inclusive: true },
				},
			},
		);

		return {
			entryCount,
			actualTotalMs: actualTotal,
			actualTotalHours: Math.round((actualTotal / 3_600_000) * 100) / 100,
			aggregateByDate: {
				totalMs: aggregateTotal,
				totalHours: Math.round((aggregateTotal / 3_600_000) * 100) / 100,
				diffMs: aggregateTotal - actualTotal,
			},
			aggregateByClient: {
				totalMs: aggregateByClientTotal,
				totalHours: Math.round((aggregateByClientTotal / 3_600_000) * 100) / 100,
				diffMs: aggregateByClientTotal - actualTotal,
			},
			aggregateByProject: {
				totalMs: aggregateByProjectTotal,
				totalHours: Math.round((aggregateByProjectTotal / 3_600_000) * 100) / 100,
				diffMs: aggregateByProjectTotal - actualTotal,
			},
			aggregateByCategory: {
				totalMs: aggregateByCategoryTotal,
				totalHours: Math.round((aggregateByCategoryTotal / 3_600_000) * 100) / 100,
				diffMs: aggregateByCategoryTotal - actualTotal,
			},
		};
	},
});
