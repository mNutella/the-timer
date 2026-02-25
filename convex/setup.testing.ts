import { convexTest } from "convex-test";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

// convex-test needs the module map to discover functions. The glob path is
// relative to THIS file (which lives in convex/), so "./**/*.*s" covers all
// .ts files in the convex directory.
// biome-ignore lint/suspicious/noExplicitAny: import.meta.glob is a Vite-specific API not in default TS types
const modules = (import.meta as any).glob("./**/*.*s");

// convex-test expects GenericSchema but convex-ents produces a slightly
// different type. The runtime shape is identical so a cast is safe.
// biome-ignore lint/suspicious/noExplicitAny: schema type mismatch between convex-ents and convex-test
export function createTest() {
	return convexTest(schema as any, modules);
}

// biome-ignore lint/suspicious/noExplicitAny: convex-test ctx uses generic Id<string>
type TestCtx = any;

/**
 * Seed a user and return an authenticated test accessor.
 * The `subject` is set to `"userId|sessionId"` matching @convex-dev/auth's
 * TOKEN_SUB_CLAIM_DIVIDER format so `getAuthUserId(ctx)` returns the userId.
 */
export async function authenticateAs(
	t: ReturnType<typeof createTest>,
	overrides: Partial<{ name: string; email: string }> = {},
) {
	const userId = await t.run(async (ctx) => seedUser(ctx, overrides));
	const asUser = t.withIdentity({ subject: `${userId}|fake-session` });
	return { userId, asUser };
}

export async function seedUser(
	ctx: TestCtx,
	overrides: Partial<{ name: string; email: string }> = {},
): Promise<Id<"users">> {
	return ctx.db.insert("users", {
		name: overrides.name ?? "Test User",
		email: overrides.email ?? `test-${Date.now()}@example.com`,
		updated_at: Date.now(),
	});
}

export async function seedClient(
	ctx: TestCtx,
	userId: Id<"users">,
	name = "Test Client",
): Promise<Id<"clients">> {
	return ctx.db.insert("clients", {
		name,
		userId,
		updated_at: Date.now(),
	});
}

export async function seedProject(
	ctx: TestCtx,
	userId: Id<"users">,
	opts: { name?: string; clientId?: Id<"clients"> } = {},
): Promise<Id<"projects">> {
	return ctx.db.insert("projects", {
		name: opts.name ?? "Test Project",
		userId,
		clientId: opts.clientId,
		status: "active",
		updated_at: Date.now(),
	});
}

export async function seedCategory(
	ctx: TestCtx,
	userId: Id<"users">,
	name = "Test Category",
): Promise<Id<"categories">> {
	return ctx.db.insert("categories", {
		name,
		userId,
		updated_at: Date.now(),
	});
}

export async function seedTimeEntry(
	ctx: TestCtx,
	userId: Id<"users">,
	overrides: Partial<{
		name: string;
		start_time: number;
		end_time: number;
		duration: number;
		clientId: Id<"clients">;
		projectId: Id<"projects">;
		categoryId: Id<"categories">;
	}> = {},
): Promise<Id<"time_entries">> {
	return ctx.db.insert("time_entries", {
		name: overrides.name ?? "Test Entry",
		userId,
		start_time: overrides.start_time,
		end_time: overrides.end_time,
		duration: overrides.duration,
		clientId: overrides.clientId,
		projectId: overrides.projectId,
		categoryId: overrides.categoryId,
		updated_at: Date.now(),
	});
}
