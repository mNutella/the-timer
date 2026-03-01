import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../types";
import { assertOwnership } from "./helpers";

export async function create(
	ctx: MutationCtx,
	{
		name,
		userId,
		clientId,
		hourly_rate_cents,
	}: {
		name: string;
		userId: Id<"users">;
		clientId?: Id<"clients">;
		hourly_rate_cents?: number;
	},
) {
	// Check if user has access to client if clientId is provided
	if (clientId) {
		const client = await ctx.table("clients").getX(clientId);
		assertOwnership(client, userId, "Client");
	}

	const projectData = {
		name,
		userId,
		status: "active" as const,
		updated_at: Date.now(),
		clientId,
		hourly_rate_cents,
	};
	const projectId = await ctx.table("projects").insert(projectData);

	return projectId;
}

export async function update(
	ctx: MutationCtx,
	{
		id,
		userId,
		name,
		status,
		clientId,
		clearClientId,
		hourly_rate_cents,
	}: {
		id: Id<"projects">;
		userId: Id<"users">;
		name?: string;
		status?: "active" | "archived" | "completed";
		clientId?: Id<"clients">;
		clearClientId?: boolean;
		hourly_rate_cents?: number | null;
	},
) {
	const project = await ctx.table("projects").getX(id);
	assertOwnership(project, userId, "Project");

	const updates: Record<string, unknown> = { updated_at: Date.now() };
	if (name !== undefined) updates.name = name;
	if (status !== undefined) updates.status = status;
	if (clearClientId) {
		updates.clientId = undefined;
	} else if (clientId !== undefined) {
		updates.clientId = clientId;
	}
	if (hourly_rate_cents === null) {
		updates.hourly_rate_cents = undefined;
	} else if (hourly_rate_cents !== undefined) {
		updates.hourly_rate_cents = hourly_rate_cents;
	}

	await project.patch(updates);
}

export async function deleteOne(
	ctx: MutationCtx,
	{ id, userId }: { id: Id<"projects">; userId: Id<"users"> },
) {
	const project = await ctx.table("projects").getX(id);
	assertOwnership(project, userId, "Project");

	// Nullify projectId on linked time entries
	const timeEntries = await ctx.table("time_entries", "by_user_and_project", (q) =>
		q.eq("userId", userId).eq("projectId", id),
	);

	for (const entry of timeEntries) {
		await entry.patch({ projectId: undefined, updated_at: Date.now() });
	}

	await project.delete();
}
