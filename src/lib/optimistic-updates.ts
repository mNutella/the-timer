import type { OptimisticLocalStore } from "convex/browser";
import type { Id } from "@/../convex/_generated/dataModel";
import { api } from "@/../convex/_generated/api";

// ─── Shared Helpers ─────────────────────────────────────────────

/** Find an entity by ID from any cached list or searchByName query. */
// biome-ignore lint/suspicious/noExplicitAny: getAllQueries returns loosely-typed results
function findInCache(localStore: OptimisticLocalStore, listRef: any, searchRef: any, id: string) {
	// Check flat list queries (e.g. clients.list)
	for (const { value } of localStore.getAllQueries(listRef)) {
		if (!value) continue;
		const found = (value as { _id: string }[]).find((item) => item._id === id);
		if (found) return found;
	}
	// Check paginated searchByName queries (e.g. clients.searchByName)
	for (const { value } of localStore.getAllQueries(searchRef)) {
		if (!value) continue;
		const page = (value as { page?: { _id: string }[] }).page;
		if (!page) continue;
		const found = page.find((item) => item._id === id);
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

	for (const { args: queryArgs, value } of localStore.getAllQueries(
		api.time_entries.getRunningTimer,
	)) {
		if (value && value._id === timeEntryId) {
			localStore.setQuery(
				api.time_entries.getRunningTimer,
				queryArgs,
				{ ...value, ...patch },
			);
		}
	}
}

/** Remove time entries by ID set from searchTimeEntries pages + clear running timer if matched. */
function deleteEntriesFromCaches(
	localStore: OptimisticLocalStore,
	idSet: Set<string>,
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

	for (const { args: queryArgs, value } of localStore.getAllQueries(
		api.time_entries.getRunningTimer,
	)) {
		if (value && idSet.has(value._id)) {
			localStore.setQuery(api.time_entries.getRunningTimer, queryArgs, null);
		}
	}
}

// ─── Timer Stop ─────────────────────────────────────────────────

export function optimisticStopTimer(
	localStore: OptimisticLocalStore,
	args: { id: Id<"time_entries"> },
) {
	const now = Date.now();

	for (const { args: queryArgs, value } of localStore.getAllQueries(
		api.time_entries.getRunningTimer,
	)) {
		if (!value || value._id === args.id) {
			localStore.setQuery(api.time_entries.getRunningTimer, queryArgs, null);
		}
	}

	stopEntryInSearchPages(localStore, args.id, now);
}

// ─── Timer Create / Resume ──────────────────────────────────────

export function optimisticCreateTimer(
	localStore: OptimisticLocalStore,
	args: {
		name: string;
		timeEntryId?: Id<"time_entries">;
		clientId?: Id<"clients">;
		projectId?: Id<"projects">;
		categoryId?: Id<"categories">;
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
			for (const { value } of localStore.getAllQueries(
				api.time_entries.getRunningTimer,
			)) {
				if (value && value._id === args.timeEntryId) {
					source = value;
					break;
				}
			}
		}
	}

	// Stop old running timer in searchTimeEntries pages if present
	for (const { args: queryArgs, value } of localStore.getAllQueries(
		api.time_entries.getRunningTimer,
	)) {
		if (value) {
			stopEntryInSearchPages(localStore, value._id, now);
		}
		// Clear old running timer
		localStore.setQuery(api.time_entries.getRunningTimer, queryArgs, null);
	}

	// Resolve entity references from cache when IDs are passed directly
	const clientId = source?.clientId ?? args.clientId;
	const projectId = source?.projectId ?? args.projectId;
	const categoryId = source?.categoryId ?? args.categoryId;

	// Resolve entity objects from cache when not available from source.
	// Try entity list/search caches first, then fall back to getRecentProjects
	// (always active via the island data bridge).
	let client: RunningTimer["client"] = source?.client ?? null;
	let project: RunningTimer["project"] = source?.project ?? null;
	let category: RunningTimer["category"] = source?.category ?? null;

	if (!client && clientId) {
		client = findInCache(localStore, api.clients.list, api.clients.searchByName, clientId) as RunningTimer["client"];
	}
	if (!project && projectId) {
		project = findInCache(localStore, api.projects.list, api.projects.searchByName, projectId) as RunningTimer["project"];
	}
	if (!category && categoryId) {
		category = findInCache(localStore, api.categories.list, api.categories.searchByName, categoryId) as RunningTimer["category"];
	}

	// Fallback: resolve names from getRecentProjects cache (always active via bridge)
	if ((!client && clientId) || (!project && projectId)) {
		for (const { value } of localStore.getAllQueries(api.time_entries.getRecentProjects)) {
			if (!value) continue;
			for (const rp of value) {
				if (!client && clientId && rp.clientId === clientId && rp.clientName) {
					client = { _id: clientId, name: rp.clientName } as unknown as RunningTimer["client"];
				}
				if (!project && projectId && rp.projectId === projectId && rp.projectName) {
					project = { _id: projectId, name: rp.projectName } as unknown as RunningTimer["project"];
				}
			}
			if ((!clientId || client) && (!projectId || project)) break;
		}
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
		clientId,
		projectId,
		categoryId,
		client,
		project,
		category,
		tags: source?.tags ?? [],
	};

	// Set optimistic running timer for all cached getRunningTimer queries
	for (const { args: queryArgs } of localStore.getAllQueries(
		api.time_entries.getRunningTimer,
	)) {
		localStore.setQuery(
			api.time_entries.getRunningTimer,
			queryArgs,
			syntheticEntry,
		);
	}

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
	args: { id: Id<"clients">; name: string },
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
	args: { id: Id<"clients"> },
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
					const client = findInCache(localStore, api.clients.list, api.clients.searchByName, args.clientId);
					updated.clientName = client ? (client as unknown as { name: string }).name : null;
				}
				return updated;
			}),
		);
	}
}

export function optimisticDeleteProject(
	localStore: OptimisticLocalStore,
	args: { id: Id<"projects"> },
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
	args: { id: Id<"categories">; name: string },
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
	args: { id: Id<"categories"> },
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
		name?: string;
		notes?: string;
		duration?: number;
		startDate?: number;
		endDate?: number;
	},
) {
	const patch: Record<string, unknown> = {};
	if (args.name !== undefined) patch.name = args.name;
	if (args.notes !== undefined) patch.notes = args.notes;
	if (args.duration !== undefined) patch.duration = args.duration;
	if (args.startDate !== undefined) patch.start_time = args.startDate;
	if (args.endDate !== undefined) patch.end_time = args.endDate;

	updateTimeEntryInCaches(localStore, args.id, patch);
}

// ─── Time Entry: Update Client/Project/Category ─────────────────

export function optimisticUpdateTimeEntryClient(
	localStore: OptimisticLocalStore,
	args: {
		timeEntryId: Id<"time_entries">;
		clientId?: Id<"clients">;
		newClientName?: string;
	},
) {
	if (args.newClientName) return;
	updateTimeEntryInCaches(localStore, args.timeEntryId, {
		clientId: args.clientId,
		client: args.clientId ? findInCache(localStore, api.clients.list, api.clients.searchByName, args.clientId) : null,
	});
}

export function optimisticUpdateTimeEntryProject(
	localStore: OptimisticLocalStore,
	args: {
		timeEntryId: Id<"time_entries">;
		projectId?: Id<"projects">;
		newProjectName?: string;
	},
) {
	if (args.newProjectName) return;
	updateTimeEntryInCaches(localStore, args.timeEntryId, {
		projectId: args.projectId,
		project: args.projectId ? findInCache(localStore, api.projects.list, api.projects.searchByName, args.projectId) : null,
	});
}

export function optimisticUpdateTimeEntryCategory(
	localStore: OptimisticLocalStore,
	args: {
		timeEntryId: Id<"time_entries">;
		categoryId?: Id<"categories">;
		newCategoryName?: string;
	},
) {
	if (args.newCategoryName) return;
	updateTimeEntryInCaches(localStore, args.timeEntryId, {
		categoryId: args.categoryId,
		category: args.categoryId ? findInCache(localStore, api.categories.list, api.categories.searchByName, args.categoryId) : null,
	});
}

// ─── Bulk Update (paginated) ────────────────────────────────────

export function optimisticBulkUpdateTimeEntries(
	localStore: OptimisticLocalStore,
	args: {
		ids: Id<"time_entries">[];
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
		patch.client = findInCache(localStore, api.clients.list, api.clients.searchByName, args.clientId) ?? null;
	}
	if (args.projectId !== undefined) {
		patch.projectId = args.projectId;
		patch.project = findInCache(localStore, api.projects.list, api.projects.searchByName, args.projectId) ?? null;
	}
	if (args.categoryId !== undefined) {
		patch.categoryId = args.categoryId;
		patch.category = findInCache(localStore, api.categories.list, api.categories.searchByName, args.categoryId) ?? null;
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
	args: { id: Id<"time_entries"> },
) {
	deleteEntriesFromCaches(localStore, new Set([args.id]));
}

// ─── Bulk Delete (paginated) ────────────────────────────────────

export function optimisticBulkDeleteTimeEntries(
	localStore: OptimisticLocalStore,
	args: { ids: Id<"time_entries">[] },
) {
	deleteEntriesFromCaches(localStore, new Set(args.ids));
}
