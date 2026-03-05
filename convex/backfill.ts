import { v } from "convex/values";

import {
	timeEntriesTotalDurationByDateAggregate,
	timeEntriesTotalDurationByClientAndDateAggregate,
	timeEntriesTotalDurationByProjectAndDateAggregate,
	timeEntriesTotalDurationByCategoryAndDateAggregate,
} from "./aggregates";
import { internalMutation } from "./functions";

export const clearAllAggregates = internalMutation({
	args: {},
	handler: async (ctx) => {
		await timeEntriesTotalDurationByDateAggregate.clearAll(ctx);
		await timeEntriesTotalDurationByClientAndDateAggregate.clearAll(ctx);
		await timeEntriesTotalDurationByProjectAndDateAggregate.clearAll(ctx);
		await timeEntriesTotalDurationByCategoryAndDateAggregate.clearAll(ctx);
	},
});

// IMPORTANT: Call clearAllAggregates first. insertIfDoesNotExist checks by _id,
// so stale entries from the old sortKey schema will not be corrected by this backfill.
export const backfillAggregates = internalMutation({
	args: {
		cursor: v.optional(v.string()),
		batchSize: v.optional(v.number()),
	},
	handler: async (ctx, { cursor, batchSize = 100 }) => {
		const results = await ctx.db
			.query("time_entries")
			.paginate({ cursor: cursor ?? null, numItems: batchSize });

		for (const doc of results.page) {
			await timeEntriesTotalDurationByDateAggregate.insertIfDoesNotExist(ctx, doc);
			await timeEntriesTotalDurationByClientAndDateAggregate.insertIfDoesNotExist(ctx, doc);
			await timeEntriesTotalDurationByProjectAndDateAggregate.insertIfDoesNotExist(ctx, doc);
			await timeEntriesTotalDurationByCategoryAndDateAggregate.insertIfDoesNotExist(ctx, doc);
		}

		return {
			isDone: results.isDone,
			cursor: results.continueCursor,
			processed: results.page.length,
		};
	},
});
