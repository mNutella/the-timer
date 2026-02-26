import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../types";

export async function get(
	ctx: QueryCtx,
	{ userId }: { userId: Id<"users"> },
) {
	const settings = await ctx
		.table("user_settings", "userId", (q) => q.eq("userId", userId))
		.first();

	return settings?.doc() ?? null;
}

export async function upsert(
	ctx: MutationCtx,
	{
		userId,
		default_hourly_rate,
		default_currency,
	}: {
		userId: Id<"users">;
		default_hourly_rate?: number;
		default_currency?: string;
	},
) {
	const existing = await ctx
		.table("user_settings", "userId", (q) => q.eq("userId", userId))
		.first();

	if (existing) {
		const updates: Record<string, unknown> = { updated_at: Date.now() };
		if (default_hourly_rate !== undefined)
			updates.default_hourly_rate = default_hourly_rate;
		if (default_currency !== undefined)
			updates.default_currency = default_currency;
		await existing.patch(updates);
		return existing._id;
	}

	return ctx.table("user_settings").insert({
		userId,
		default_hourly_rate,
		default_currency: default_currency ?? "USD",
		updated_at: Date.now(),
	});
}
