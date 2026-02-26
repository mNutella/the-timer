import { v } from "convex/values";

import { mutation, query } from "./functions";
import { getRequiredUserId } from "./model/auth";
import * as UserSettings from "./model/user_settings";

export const get = query({
	args: {},
	handler: async (ctx) => {
		const userId = await getRequiredUserId(ctx);
		return UserSettings.get(ctx, { userId });
	},
});

export const upsert = mutation({
	args: {
		default_hourly_rate: v.optional(v.number()),
		default_currency: v.optional(v.string()),
	},
	handler: async (ctx, params) => {
		const userId = await getRequiredUserId(ctx);
		return UserSettings.upsert(ctx, { ...params, userId });
	},
});
