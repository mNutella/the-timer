import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../types";
import { assertOwnership } from "./helpers";

type GroupByDimension = "client" | "project" | "category" | "name";

interface GroupingRule {
	group_by: GroupByDimension;
}

export async function list(
	ctx: QueryCtx,
	{ userId }: { userId: Id<"users"> },
) {
	return ctx
		.table("invoice_presets", "userId", (q) => q.eq("userId", userId))
		.order("asc");
}

export async function create(
	ctx: MutationCtx,
	{
		userId,
		name,
		grouping_rules,
		merge_entries,
		include_date_range,
		include_duration,
	}: {
		userId: Id<"users">;
		name: string;
		grouping_rules: GroupingRule[];
		merge_entries: boolean;
		include_date_range: boolean;
		include_duration: boolean;
	},
) {
	return ctx.table("invoice_presets").insert({
		name,
		userId,
		grouping_rules,
		merge_entries,
		include_date_range,
		include_duration,
		updated_at: Date.now(),
	});
}

export async function update(
	ctx: MutationCtx,
	{
		id,
		userId,
		name,
		grouping_rules,
		merge_entries,
		include_date_range,
		include_duration,
	}: {
		id: Id<"invoice_presets">;
		userId: Id<"users">;
		name?: string;
		grouping_rules?: GroupingRule[];
		merge_entries?: boolean;
		include_date_range?: boolean;
		include_duration?: boolean;
	},
) {
	const preset = await ctx.table("invoice_presets").getX(id);
	assertOwnership(preset, userId, "Invoice preset");

	const updates: Record<string, unknown> = { updated_at: Date.now() };
	if (name !== undefined) updates.name = name;
	if (grouping_rules !== undefined) updates.grouping_rules = grouping_rules;
	if (merge_entries !== undefined) updates.merge_entries = merge_entries;
	if (include_date_range !== undefined)
		updates.include_date_range = include_date_range;
	if (include_duration !== undefined)
		updates.include_duration = include_duration;

	await preset.patch(updates);
}

export async function deleteOne(
	ctx: MutationCtx,
	{ id, userId }: { id: Id<"invoice_presets">; userId: Id<"users"> },
) {
	const preset = await ctx.table("invoice_presets").getX(id);
	assertOwnership(preset, userId, "Invoice preset");
	await preset.delete();
}
