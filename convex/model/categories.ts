import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../types";
import { assertOwnership } from "./helpers";

export async function create(
	ctx: MutationCtx,
	{ name, userId }: { name: string; userId: Id<"users"> },
) {
	const categoryId = await ctx.table("categories").insert({
		name,
		userId,
		updated_at: Date.now(),
	});

	return categoryId;
}

export async function update(
	ctx: MutationCtx,
	{ id, userId, name }: { id: Id<"categories">; userId: Id<"users">; name: string },
) {
	const category = await ctx.table("categories").getX(id);
	assertOwnership(category, userId, "Category");

	await category.patch({ name, updated_at: Date.now() });
}

export async function deleteOne(
	ctx: MutationCtx,
	{ id, userId }: { id: Id<"categories">; userId: Id<"users"> },
) {
	const category = await ctx.table("categories").getX(id);
	assertOwnership(category, userId, "Category");

	// Nullify categoryId on linked time entries
	const timeEntries = await ctx.table("time_entries", "by_user_and_category", (q) =>
		q.eq("userId", userId).eq("categoryId", id),
	);

	for (const entry of timeEntries) {
		await entry.patch({ categoryId: undefined, updated_at: Date.now() });
	}

	await category.delete();
}
