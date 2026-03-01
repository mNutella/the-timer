import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../types";

/**
 * Determines if a time entry is billable.
 * - `billable === true` → always billable
 * - `billable === false` → never billable
 * - `billable === undefined` → auto: billable if entry has a client
 */
export function isBillable(entry: { billable?: boolean; clientId?: Id<"clients"> }): boolean {
	if (entry.billable === true) return true;
	if (entry.billable === false) return false;
	// Auto: billable if has a client
	return entry.clientId !== undefined;
}

/**
 * Resolves the hourly rate for an entry in cents.
 * Priority: project.rate > client.rate > userDefault > 0
 */
export function resolveRate(
	project: { hourly_rate_cents?: number } | null,
	client: { hourly_rate_cents?: number } | null,
	defaultRate?: number,
): number {
	return project?.hourly_rate_cents ?? client?.hourly_rate_cents ?? defaultRate ?? 0;
}

interface EntryForRate {
	clientId?: Id<"clients">;
	projectId?: Id<"projects">;
}

/**
 * Batch-resolves rates for multiple entries, caching client/project lookups.
 */
export async function batchResolveRates(
	ctx: QueryCtx,
	entries: EntryForRate[],
	defaultRate: number,
): Promise<Map<string, number>> {
	const clientCache = new Map<string, Doc<"clients"> | null>();
	const projectCache = new Map<string, Doc<"projects"> | null>();

	// Collect unique IDs
	const clientIds = new Set<Id<"clients">>();
	const projectIds = new Set<Id<"projects">>();
	for (const entry of entries) {
		if (entry.clientId) clientIds.add(entry.clientId);
		if (entry.projectId) projectIds.add(entry.projectId);
	}

	// Batch fetch clients
	await Promise.all(
		[...clientIds].map(async (id) => {
			const client = await ctx.table("clients").get(id);
			clientCache.set(id, client);
		}),
	);

	// Batch fetch projects
	await Promise.all(
		[...projectIds].map(async (id) => {
			const project = await ctx.table("projects").get(id);
			projectCache.set(id, project);
		}),
	);

	return { clientCache, projectCache, defaultRate } as unknown as Map<string, number>;
}

/**
 * Resolves rate for a single entry using pre-fetched caches.
 */
export function resolveRateFromCaches(
	entry: EntryForRate,
	clientCache: Map<string, { hourly_rate_cents?: number } | null>,
	projectCache: Map<string, { hourly_rate_cents?: number } | null>,
	defaultRate: number,
): number {
	const project = entry.projectId ? projectCache.get(entry.projectId) : null;
	const client = entry.clientId ? clientCache.get(entry.clientId) : null;
	return resolveRate(project ?? null, client ?? null, defaultRate);
}

/**
 * Fetches and caches client/project data for rate resolution.
 */
export async function buildRateCaches(ctx: QueryCtx, entries: EntryForRate[]) {
	const clientCache = new Map<string, { hourly_rate_cents?: number } | null>();
	const projectCache = new Map<string, { hourly_rate_cents?: number } | null>();

	const clientIds = new Set<string>();
	const projectIds = new Set<string>();
	for (const entry of entries) {
		if (entry.clientId) clientIds.add(entry.clientId);
		if (entry.projectId) projectIds.add(entry.projectId);
	}

	await Promise.all([
		...[...clientIds].map(async (id) => {
			const client = await ctx.table("clients").get(id as Id<"clients">);
			clientCache.set(id, client ? { hourly_rate_cents: client.hourly_rate_cents } : null);
		}),
		...[...projectIds].map(async (id) => {
			const project = await ctx.table("projects").get(id as Id<"projects">);
			projectCache.set(id, project ? { hourly_rate_cents: project.hourly_rate_cents } : null);
		}),
	]);

	return { clientCache, projectCache };
}
