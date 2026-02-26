import { v } from "convex/values";

import { mutation, query } from "./functions";
import { getRequiredUserId } from "./model/auth";
import * as Invoices from "./model/invoices";

const groupingRuleValidator = v.object({
	group_by: v.union(
		v.literal("client"),
		v.literal("project"),
		v.literal("category"),
		v.literal("name"),
	),
});

const lineItemValidator = v.object({
	label: v.string(),
	duration_ms: v.number(),
	rate_cents: v.number(),
	amount_cents: v.number(),
	group_key: v.optional(v.string()),
});

export const previewLineItems = query({
	args: {
		startDate: v.number(),
		endDate: v.number(),
		clientId: v.optional(v.id("clients")),
		groupingRules: v.array(groupingRuleValidator),
		mergeEntries: v.boolean(),
		includeDateRange: v.boolean(),
		includeDuration: v.boolean(),
	},
	handler: async (ctx, params) => {
		const userId = await getRequiredUserId(ctx);
		return Invoices.previewLineItems(ctx, { ...params, userId });
	},
});

export const create = mutation({
	args: {
		number: v.optional(v.string()),
		clientId: v.optional(v.id("clients")),
		startDate: v.number(),
		endDate: v.number(),
		lineItems: v.array(lineItemValidator),
		subtotal_cents: v.number(),
		notes: v.optional(v.string()),
	},
	handler: async (ctx, params) => {
		const userId = await getRequiredUserId(ctx);
		return Invoices.create(ctx, { ...params, userId });
	},
});

export const update = mutation({
	args: {
		id: v.id("invoices"),
		number: v.optional(v.string()),
		notes: v.optional(v.string()),
		lineItems: v.optional(v.array(lineItemValidator)),
		subtotal_cents: v.optional(v.number()),
	},
	handler: async (ctx, params) => {
		const userId = await getRequiredUserId(ctx);
		await Invoices.update(ctx, { ...params, userId });
	},
});

export const deleteOne = mutation({
	args: {
		id: v.id("invoices"),
	},
	handler: async (ctx, { id }) => {
		const userId = await getRequiredUserId(ctx);
		await Invoices.deleteOne(ctx, { id, userId });
	},
});

export const list = query({
	args: {},
	handler: async (ctx) => {
		const userId = await getRequiredUserId(ctx);
		return Invoices.list(ctx, { userId });
	},
});

export const getById = query({
	args: {
		id: v.id("invoices"),
	},
	handler: async (ctx, { id }) => {
		const userId = await getRequiredUserId(ctx);
		return Invoices.getById(ctx, { id, userId });
	},
});

export const getLastEndDate = query({
	args: {
		clientId: v.optional(v.id("clients")),
	},
	handler: async (ctx, { clientId }) => {
		const userId = await getRequiredUserId(ctx);
		return Invoices.getLastEndDate(ctx, { userId, clientId });
	},
});

export const getUnbilledTotal = query({
	args: {},
	handler: async (ctx) => {
		const userId = await getRequiredUserId(ctx);
		return Invoices.getUnbilledTotal(ctx, { userId });
	},
});
