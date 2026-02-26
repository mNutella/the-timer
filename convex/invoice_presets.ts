import { v } from "convex/values";

import { mutation, query } from "./functions";
import { getRequiredUserId } from "./model/auth";
import * as InvoicePresets from "./model/invoice_presets";

const groupingRuleValidator = v.object({
	group_by: v.union(
		v.literal("client"),
		v.literal("project"),
		v.literal("category"),
		v.literal("name"),
	),
});

export const list = query({
	args: {},
	handler: async (ctx) => {
		const userId = await getRequiredUserId(ctx);
		return InvoicePresets.list(ctx, { userId });
	},
});

export const create = mutation({
	args: {
		name: v.string(),
		grouping_rules: v.array(groupingRuleValidator),
		merge_entries: v.boolean(),
		include_date_range: v.boolean(),
		include_duration: v.boolean(),
	},
	handler: async (ctx, params) => {
		const userId = await getRequiredUserId(ctx);
		return InvoicePresets.create(ctx, { ...params, userId });
	},
});

export const update = mutation({
	args: {
		id: v.id("invoice_presets"),
		name: v.optional(v.string()),
		grouping_rules: v.optional(v.array(groupingRuleValidator)),
		merge_entries: v.optional(v.boolean()),
		include_date_range: v.optional(v.boolean()),
		include_duration: v.optional(v.boolean()),
	},
	handler: async (ctx, params) => {
		const userId = await getRequiredUserId(ctx);
		await InvoicePresets.update(ctx, { ...params, userId });
	},
});

export const deleteOne = mutation({
	args: {
		id: v.id("invoice_presets"),
	},
	handler: async (ctx, { id }) => {
		const userId = await getRequiredUserId(ctx);
		await InvoicePresets.deleteOne(ctx, { id, userId });
	},
});
