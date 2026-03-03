import { getAuthUserId } from "@convex-dev/auth/server";

import { clog } from "../logger";
import type { QueryCtx, MutationCtx } from "../types";

export async function getRequiredUserId(ctx: QueryCtx | MutationCtx) {
	const userId = await getAuthUserId(ctx);
	if (userId) return userId;

	// Dev-only: bypass auth for local development where OAuth deep links
	// can't redirect back to the dev app. Only set this env var on the
	// dev Convex deployment — never on production.
	if (process.env.DEV_BYPASS_AUTH === "true") {
		clog.warn("auth", "DEV_BYPASS_AUTH active — using first user as fallback");
		const firstUser = await ctx.db.query("users").first();
		if (firstUser) return firstUser._id;
	}

	throw new Error("Not authenticated");
}
