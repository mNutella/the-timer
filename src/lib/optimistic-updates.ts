import type { OptimisticLocalStore } from "convex/browser";
import type { Id } from "@/../convex/_generated/dataModel";
import { api } from "@/../convex/_generated/api";

// ─── Shared Helpers ─────────────────────────────────────────────

/** Find an entity by ID from any cached list query variant. */
// biome-ignore lint/suspicious/noExplicitAny: getAllQueries returns loosely-typed results
function findInCache(localStore: OptimisticLocalStore, queryRef: any, id: string) {
	for (const { value } of localStore.getAllQueries(queryRef)) {
		if (!value) continue;
		const found = (value as { _id: string }[]).find((item) => item._id === id);
		if (found) return found;
	}
	return null;
}

/** Mark a running entry as stopped in all searchTimeEntries pages. */
function stopEntryInSearchPages(
	localStore: OptimisticLocalStore,
	entryId: string,
	now: number,
) {
	for (const { args: queryArgs, value } of localStore.getAllQueries(
		api.time_entries.searchTimeEntries,
	)) {
		if (!value) continue;
		const idx = value.page.findIndex((e) => e._id === entryId);
		if (idx === -1) continue;

		const entry = value.page[idx];
		const duration = entry.start_time ? now - entry.start_time : 0;
		const newPage = [...value.page];
		newPage[idx] = { ...entry, end_time: now, duration };
		localStore.setQuery(api.time_entries.searchTimeEntries, queryArgs, {
			...value,
			page: newPage,
		});
	}
}

/** Patch a single time entry across searchTimeEntries pages and getRunningTimer. */
function updateTimeEntryInCaches(
	localStore: OptimisticLocalStore,
	timeEntryId: Id<"time_entries">,
	userId: Id<"users">,
	patch: Record<string, unknown>,
) {
	for (const { args: queryArgs, value } of localStore.getAllQueries(
		api.time_entries.searchTimeEntries,
	)) {
		if (!value) continue;
		const idx = value.page.findIndex((e) => e._id === timeEntryId);
		if (idx === -1) continue;
		const newPage = [...value.page];
		newPage[idx] = { ...value.page[idx], ...patch };
		localStore.setQuery(api.time_entries.searchTimeEntries, queryArgs, {
			...value,
			page: newPage,
		});
	}

	const runningTimer = localStore.getQuery(
		api.time_entries.getRunningTimer,
		{ userId },
	);
	if (runningTimer && runningTimer._id === timeEntryId) {
		localStore.setQuery(
			api.time_entries.getRunningTimer,
			{ userId },
			{ ...runningTimer, ...patch },
		);
	}
}

/** Remove time entries by ID set from searchTimeEntries pages + clear running timer if matched. */
function deleteEntriesFromCaches(
	localStore: OptimisticLocalStore,
	idSet: Set<string>,
	userId: Id<"users">,
) {
	for (const { args: queryArgs, value } of localStore.getAllQueries(
		api.time_entries.searchTimeEntries,
	)) {
		if (!value) continue;
		const filtered = value.page.filter((e) => !idSet.has(e._id));
		if (filtered.length !== value.page.length) {
			localStore.setQuery(api.time_entries.searchTimeEntries, queryArgs, {
				...value,
				page: filtered,
			});
		}
	}

	const runningTimer = localStore.getQuery(
		api.time_entries.getRunningTimer,
		{ userId },
	);
	if (runningTimer && idSet.has(runningTimer._id)) {
		localStore.setQuery(api.time_entries.getRunningTimer, { userId }, null);
	}
}

// ─── Timer Stop ─────────────────────────────────────────────────

export function optimisticStopTimer(
	localStore: OptimisticLocalStore,
	args: { id: Id<"time_entries">; userId: Id<"users"> },
) {
	const now = Date.now();
	const currentTimer = localStore.getQuery(api.time_entries.getRunningTimer, {
		userId: args.userId,
	});
	// Clear running timer if it matches or if the cache hasn't loaded yet
	if (!currentTimer || currentTimer._id === args.id) {
		localStore.setQuery(
			api.time_entries.getRunningTimer,
			{ userId: args.userId },
			null,
		);
	}

	stopEntryInSearchPages(localStore, args.id, now);
}

// ─── Timer Create / Resume ──────────────────────────────────────

export function optimisticCreateTimer(
	localStore: OptimisticLocalStore,
	args: {
		userId: Id<"users">;
		name: string;
		timeEntryId?: Id<"time_entries">;
	},
) {
	const now = Date.now();

	// If resuming, look up source entry from cached search results
	type RunningTimer = NonNullable<
		ReturnType<typeof localStore.getQuery<typeof api.time_entries.getRunningTimer>>
	>;
	let source: RunningTimer | null = null;

	if (args.timeEntryId) {
		// Check paginated search cache
		for (const { value } of localStore.getAllQueries(
			api.time_entries.searchTimeEntries,
		)) {
			if (!value) continue;
			const found = value.page.find((e) => e._id === args.timeEntryId);
			if (found) {
				source = found as unknown as RunningTimer;
				break;
			}
		}
		// Also check running timer (source might be the currently running entry)
		if (!source) {
			const current = localStore.getQuery(
				api.time_entries.getRunningTimer,
				{ userId: args.userId },
			);
			if (current && current._id === args.timeEntryId) {
				source = current;
			}
		}
	}

	// Stop old running timer in searchTimeEntries pages if present
	const oldRunning = localStore.getQuery(
		api.time_entries.getRunningTimer,
		{ userId: args.userId },
	);
	if (oldRunning) {
		stopEntryInSearchPages(localStore, oldRunning._id, now);
	}

	// Build the synthetic new entry
	const syntheticEntry = {
		_id: "__optimistic__" as Id<"time_entries">,
		_creationTime: now,
		name: source?.name ?? args.name,
		description: source?.description,
		start_time: now,
		end_time: undefined,
		duration: undefined,
		notes: source?.notes,
		updated_at: now,
		clientId: source?.clientId,
		projectId: source?.projectId,
		categoryId: source?.categoryId,
		client: source?.client ?? null,
		project: source?.project ?? null,
		category: source?.category ?? null,
		tags: source?.tags ?? [],
	};

	// Set optimistic running timer
	localStore.setQuery(
		api.time_entries.getRunningTimer,
		{ userId: args.userId },
		syntheticEntry,
	);

	// Add synthetic entry to first page of each searchTimeEntries query variant.
	// Only target queries with cursor=null (first pages) to avoid duplicates
	// when usePaginatedQuery flattens all page results.
	for (const { args: queryArgs, value } of localStore.getAllQueries(
		api.time_entries.searchTimeEntries,
	)) {
		if (!value) continue;
		// biome-ignore lint/suspicious/noExplicitAny: accessing paginationOpts from raw query args
		const paginationOpts = (queryArgs as any).paginationOpts;
		if (paginationOpts?.cursor != null) continue;
		localStore.setQuery(api.time_entries.searchTimeEntries, queryArgs, {
			...value,
			page: [syntheticEntry as (typeof value.page)[number], ...value.page],
		});
	}
}

// ─── Client Management ──────────────────────────────────────────

export function optimisticRenameClient(
	localStore: OptimisticLocalStore,
	args: { id: Id<"clients">; userId: Id<"users">; name: string },
) {
	for (const { args: queryArgs, value } of localStore.getAllQueries(
		api.clients.list,
	)) {
		if (!value) continue;
		localStore.setQuery(
			api.clients.list,
			queryArgs,
			value.map((item) =>
				item._id === args.id ? { ...item, name: args.name } : item,
			),
		);
	}
}

export function optimisticDeleteClient(
	localStore: OptimisticLocalStore,
	args: { id: Id<"clients">; userId: Id<"users"> },
) {
	for (const { args: queryArgs, value } of localStore.getAllQueries(
		api.clients.list,
	)) {
		if (!value) continue;
		localStore.setQuery(
			api.clients.list,
			queryArgs,
			value.filter((item) => item._id !== args.id),
		);
	}
}

// ─── Project Management ─────────────────────────────────────────

export function optimisticUpdateProject(
	localStore: OptimisticLocalStore,
	args: {
		id: Id<"projects">;
		userId: Id<"users">;
		name?: string;
		status?: "active" | "archived" | "completed";
		clientId?: Id<"clients">;
		clearClientId?: boolean;
	},
) {
	for (const { args: queryArgs, value } of localStore.getAllQueries(
		api.projects.list,
	)) {
		if (!value) continue;
		localStore.setQuery(
			api.projects.list,
			queryArgs,
			value.map((item) => {
				if (item._id !== args.id) return item;
				const updated = { ...item };
				if (args.name !== undefined) updated.name = args.name;
				if (args.status !== undefined) updated.status = args.status;
				if (args.clearClientId) {
					updated.clientId = undefined;
					updated.clientName = null;
				} else if (args.clientId !== undefined) {
					updated.clientId = args.clientId;
					const client = findInCache(localStore, api.clients.list, args.clientId);
					updated.clientName = client ? (client as unknown as { name: string }).name : null;
				}
				return updated;
			}),
		);
	}
}

export function optimisticDeleteProject(
	localStore: OptimisticLocalStore,
	args: { id: Id<"projects">; userId: Id<"users"> },
) {
	for (const { args: queryArgs, value } of localStore.getAllQueries(
		api.projects.list,
	)) {
		if (!value) continue;
		localStore.setQuery(
			api.projects.list,
			queryArgs,
			value.filter((item) => item._id !== args.id),
		);
	}
}

// ─── Category Management ────────────────────────────────────────

export function optimisticRenameCategory(
	localStore: OptimisticLocalStore,
	args: { id: Id<"categories">; userId: Id<"users">; name: string },
) {
	for (const { args: queryArgs, value } of localStore.getAllQueries(
		api.categories.list,
	)) {
		if (!value) continue;
		localStore.setQuery(
			api.categories.list,
			queryArgs,
			value.map((item) =>
				item._id === args.id ? { ...item, name: args.name } : item,
			),
		);
	}
}

export function optimisticDeleteCategory(
	localStore: OptimisticLocalStore,
	args: { id: Id<"categories">; userId: Id<"users"> },
) {
	for (const { args: queryArgs, value } of localStore.getAllQueries(
		api.categories.list,
	)) {
		if (!value) continue;
		localStore.setQuery(
			api.categories.list,
			queryArgs,
			value.filter((item) => item._id !== args.id),
		);
	}
}

// ─── Time Entry Update (paginated) ─────────────────────────────

export function optimisticUpdateTimeEntry(
	localStore: OptimisticLocalStore,
	args: {
		id: Id<"time_entries">;
		userId: Id<"users">;
		name?: string;
		notes?: string;
		duration?: number;
		startDate?: number;
		endDate?: number;
	},
) {
	// Update in paginated search results
	for (const { args: queryArgs, value } of localStore.getAllQueries(
		api.time_entries.searchTimeEntries,
	)) {
		if (!value) continue;
		const idx = value.page.findIndex((e) => e._id === args.id);
		if (idx === -1) continue;

		const entry = value.page[idx];
		const updated = { ...entry };
		if (args.name !== undefined) updated.name = args.name;
		if (args.notes !== undefined) updated.notes = args.notes;
		if (args.duration !== undefined) updated.duration = args.duration;
		if (args.startDate !== undefined) updated.start_time = args.startDate;
		if (args.endDate !== undefined) updated.end_time = args.endDate;

		const newPage = [...value.page];
		newPage[idx] = updated;
		localStore.setQuery(api.time_entries.searchTimeEntries, queryArgs, {
			...value,
			page: newPage,
		});
	}

	// Also update getRunningTimer if this is the active timer
	const runningTimer = localStore.getQuery(
		api.time_entries.getRunningTimer,
		{ userId: args.userId },
	);
	if (runningTimer && runningTimer._id === args.id) {
		const updated = { ...runningTimer };
		if (args.name !== undefined) updated.name = args.name;
		if (args.notes !== undefined) updated.notes = args.notes;
		localStore.setQuery(
			api.time_entries.getRunningTimer,
			{ userId: args.userId },
			updated,
		);
	}
}

// ─── Time Entry: Update Client/Project/Category ─────────────────

export function optimisticUpdateTimeEntryClient(
	localStore: OptimisticLocalStore,
	args: {
		timeEntryId: Id<"time_entries">;
		userId: Id<"users">;
		clientId?: Id<"clients">;
		newClientName?: string;
	},
) {
	if (args.newClientName) return;
	updateTimeEntryInCaches(localStore, args.timeEntryId, args.userId, {
		clientId: args.clientId,
		client: args.clientId ? findInCache(localStore, api.clients.list, args.clientId) : null,
	});
}

export function optimisticUpdateTimeEntryProject(
	localStore: OptimisticLocalStore,
	args: {
		timeEntryId: Id<"time_entries">;
		userId: Id<"users">;
		projectId?: Id<"projects">;
		newProjectName?: string;
	},
) {
	if (args.newProjectName) return;
	updateTimeEntryInCaches(localStore, args.timeEntryId, args.userId, {
		projectId: args.projectId,
		project: args.projectId ? findInCache(localStore, api.projects.list, args.projectId) : null,
	});
}

export function optimisticUpdateTimeEntryCategory(
	localStore: OptimisticLocalStore,
	args: {
		timeEntryId: Id<"time_entries">;
		userId: Id<"users">;
		categoryId?: Id<"categories">;
		newCategoryName?: string;
	},
) {
	if (args.newCategoryName) return;
	updateTimeEntryInCaches(localStore, args.timeEntryId, args.userId, {
		categoryId: args.categoryId,
		category: args.categoryId ? findInCache(localStore, api.categories.list, args.categoryId) : null,
	});
}

// ─── Bulk Update (paginated) ────────────────────────────────────

export function optimisticBulkUpdateTimeEntries(
	localStore: OptimisticLocalStore,
	args: {
		ids: Id<"time_entries">[];
		userId: Id<"users">;
		clientId?: Id<"clients">;
		projectId?: Id<"projects">;
		categoryId?: Id<"categories">;
	},
) {
	const idSet = new Set<string>(args.ids);

	// Resolve entities from cached lists
	const patch: Record<string, unknown> = {};
	if (args.clientId !== undefined) {
		patch.clientId = args.clientId;
		patch.client = findInCache(localStore, api.clients.list, args.clientId) ?? null;
	}
	if (args.projectId !== undefined) {
		patch.projectId = args.projectId;
		patch.project = findInCache(localStore, api.projects.list, args.projectId) ?? null;
	}
	if (args.categoryId !== undefined) {
		patch.categoryId = args.categoryId;
		patch.category = findInCache(localStore, api.categories.list, args.categoryId) ?? null;
	}

	for (const { args: queryArgs, value } of localStore.getAllQueries(
		api.time_entries.searchTimeEntries,
	)) {
		if (!value) continue;
		let changed = false;
		const newPage = value.page.map((e) => {
			if (!idSet.has(e._id)) return e;
			changed = true;
			return { ...e, ...patch };
		});
		if (changed) {
			localStore.setQuery(api.time_entries.searchTimeEntries, queryArgs, {
				...value,
				page: newPage,
			});
		}
	}
}

// ─── Time Entry Delete (paginated) ──────────────────────────────

export function optimisticDeleteTimeEntry(
	localStore: OptimisticLocalStore,
	args: { id: Id<"time_entries">; userId: Id<"users"> },
) {
	deleteEntriesFromCaches(localStore, new Set([args.id]), args.userId);
}

// ─── Bulk Delete (paginated) ────────────────────────────────────

export function optimisticBulkDeleteTimeEntries(
	localStore: OptimisticLocalStore,
	args: { ids: Id<"time_entries">[]; userId: Id<"users"> },
) {
	deleteEntriesFromCaches(localStore, new Set(args.ids), args.userId);
}
