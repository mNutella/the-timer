import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../types";
import { assertOwnership } from "./helpers";

export async function create(
	ctx: MutationCtx,
	{ name, userId }: { name: string; userId: Id<"users"> },
) {
	const clientId = await ctx.table("clients").insert({
		name,
		userId,
		updated_at: Date.now(),
	});

	return clientId;
}

export async function update(
	ctx: MutationCtx,
	{
		id,
		userId,
		name,
	}: { id: Id<"clients">; userId: Id<"users">; name: string },
) {
	const client = await ctx.table("clients").getX(id);
	assertOwnership(client, userId, "Client");

	await client.patch({ name, updated_at: Date.now() });
}

export async function deleteOne(
	ctx: MutationCtx,
	{ id, userId }: { id: Id<"clients">; userId: Id<"users"> },
) {
	const client = await ctx.table("clients").getX(id);
	assertOwnership(client, userId, "Client");

	// Nullify clientId on linked time entries
	const timeEntries = await ctx.table(
		"time_entries",
		"by_user_and_client",
		(q) => q.eq("userId", userId).eq("clientId", id),
	);

	for (const entry of timeEntries) {
		await entry.patch({ clientId: undefined, updated_at: Date.now() });
	}

	// Nullify clientId on linked projects
	const projects = await ctx.table("projects", "by_user_and_client", (q) =>
		q.eq("userId", userId).eq("clientId", id),
	);

	for (const project of projects) {
		await project.patch({ clientId: undefined, updated_at: Date.now() });
	}

	await client.delete();
}
