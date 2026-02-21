import type { PaginationOptions } from "convex/server";
import { omit } from "convex-helpers";
import type { Doc, Id } from "../_generated/dataModel";
import type { Ent, EntQuery, MutationCtx, QueryCtx } from "../types";
import {
	computeNextTiming,
	getEndOfDay,
	getStartOfDay,
	updateIfDefined,
} from "../utils";

interface SearchTimeEntriesParams {
	userId: Id<"users">;
	filters?: {
		name?: string;
		clientIds?: Id<"clients">[];
		projectIds?: Id<"projects">[];
		categoryIds?: Id<"categories">[];
		dateRange?: {
			startDate?: number;
			endDate?: number;
		};
	};
	include?: {
		client?: boolean;
		project?: boolean;
		category?: boolean;
		tags?: boolean;
	};
	paginationOpts: PaginationOptions;
}

interface UpdateCategoryParams {
	timeEntryId: Id<"time_entries">;
	userId: Id<"users">;
	categoryId?: Id<"categories">;
	newCategoryName?: string;
}

interface UpdateProjectParams {
	timeEntryId: Id<"time_entries">;
	userId: Id<"users">;
	projectId?: Id<"projects">;
	newProjectName?: string;
}

interface UpdateClientParams {
	timeEntryId: Id<"time_entries">;
	userId: Id<"users">;
	clientId?: Id<"clients">;
	newClientName?: string;
}

interface DeleteTimeEntryParams {
	id: Id<"time_entries">;
	userId: Id<"users">;
}

interface UpdateTimeEntryParams {
	id: Id<"time_entries">;
	userId: Id<"users">;
	name?: string;
	description?: string;
	notes?: string;
	categoryId?: Id<"categories">;
	projectId?: Id<"projects">;
	clientId?: Id<"clients">;
	tagIds?: Array<Id<"tags">>;
	startDate?: number;
	endDate?: number;
	duration?: number;
}

interface StopTimeEntryParams {
	id: Id<"time_entries">;
	userId: Id<"users">;
}

interface CreateTimeEntryParams {
	userId: Id<"users">;
	name: string;
	description?: string;
	notes?: string;
	categoryId?: Id<"categories">;
	projectId?: Id<"projects">;
	clientId?: Id<"clients">;
	tagIds?: Array<Id<"tags">>;
	timeEntryId?: Id<"time_entries">;
}

export async function create(
	ctx: MutationCtx,
	{
		userId,
		name,
		description,
		notes,
		categoryId,
		projectId,
		clientId,
		tagIds,
		timeEntryId,
	}: CreateTimeEntryParams,
) {
	let existingTimeEntry:
		| (Omit<Ent<"time_entries">, "clientId" | "projectId" | "categoryId"> & {
				client: Ent<"clients"> | null;
				project: Ent<"projects"> | null;
				category: Ent<"categories"> | null;
				tags: Ent<"tags">[];
		  })
		| null = null;

	if (timeEntryId) {
		const timeEntry = await ctx.table("time_entries").getX(timeEntryId);
		if (timeEntry?.userId !== userId) {
			throw new Error("Time entry does not belong to user");
		}

		const [client, project, category, tags] = await Promise.all([
			timeEntry.edge("client"),
			timeEntry.edge("project"),
			timeEntry.edge("category"),
			timeEntry.edge("tags"),
		]);
		existingTimeEntry = {
			...omit(timeEntry, ["clientId", "projectId", "categoryId"]),
			client,
			project,
			category,
			tags,
		};
	}

	const unfinishedTimeEntry = await ctx
		.table("time_entries", "by_user_end_time", (q) =>
			q.eq("userId", userId).eq("end_time", undefined),
		)
		.first();

	const now = Date.now();

	if (unfinishedTimeEntry) {
		await unfinishedTimeEntry.patch({
			end_time: now,
			duration: now - (unfinishedTimeEntry?.start_time ?? 0),
		});
	}

	const newTimeEntryId = await ctx.table("time_entries").insert({
		name: existingTimeEntry?.name ?? name,
		description: existingTimeEntry?.description ?? description,
		notes: existingTimeEntry?.notes ?? notes,
		userId: userId,
		clientId: existingTimeEntry?.client?._id ?? clientId,
		projectId: existingTimeEntry?.project?._id ?? projectId,
		categoryId: existingTimeEntry?.category?._id ?? categoryId,
		tags: existingTimeEntry?.tags?.map((tag) => tag._id) ?? tagIds,
		start_time: now,
		updated_at: now,
	});

	return newTimeEntryId;
}

export async function stop(
	ctx: MutationCtx,
	{ id, userId }: StopTimeEntryParams,
) {
	const timeEntry = await ctx.table("time_entries").getX(id);

	if (timeEntry.userId !== userId) {
		throw new Error("Activity does not belong to user");
	}

	if (timeEntry.end_time !== undefined) {
		return timeEntry;
	}

	const now = Date.now();
	await timeEntry.patch({
		end_time: now,
		duration: now - (timeEntry?.start_time ?? 0),
		updated_at: now,
	});

	return timeEntry;
}

export async function update(
	ctx: MutationCtx,
	{
		userId,
		id,
		name,
		description,
		notes,
		categoryId,
		projectId,
		clientId,
		tagIds: _tagIds,
		startDate,
		endDate,
		duration,
	}: UpdateTimeEntryParams,
) {
	const timeEntry = await ctx.table("time_entries").getX(id);

	if (timeEntry.userId !== userId) {
		throw new Error("Activity does not belong to user");
	}

	const updateTimeEntry: Partial<Ent<"time_entries">> = {};

	updateIfDefined(updateTimeEntry, {
		name,
		description,
		notes,
		clientId,
		projectId,
		categoryId,
	});

	if (duration || startDate || endDate) {
		const {
			start_time,
			end_time,
			duration: nextDuration,
		} = computeNextTiming({
			currentStart: timeEntry.start_time,
			currentEnd: timeEntry.end_time,
			startDate,
			endDate,
			duration,
		});
		updateIfDefined(updateTimeEntry, {
			start_time,
			end_time,
			duration: nextDuration,
		});
	}

	updateTimeEntry.updated_at = Date.now();

	await timeEntry.patch(updateTimeEntry);
}

export async function deleteOne(
	ctx: MutationCtx,
	{ id, userId }: DeleteTimeEntryParams,
) {
	const time_entry = await ctx.table("time_entries").getX(id);

	if (!time_entry) {
		throw new Error("Time entry not found");
	}

	if (time_entry.userId !== userId) {
		throw new Error("Activity does not belong to user");
	}

	await time_entry.delete();
}

export async function updateClient(
	ctx: MutationCtx,
	{ timeEntryId, userId, clientId, newClientName }: UpdateClientParams,
) {
	const timeEntry = await ctx.table("time_entries").getX(timeEntryId);

	if (timeEntry.userId !== userId) {
		throw new Error("Time entry does not belong to user");
	}

	if (clientId && newClientName) {
		throw new Error("Provide exactly one of clientId or newClientName");
	}

	let nextClientId = clientId;

	if (!nextClientId && newClientName) {
		const normalized = newClientName.trim();
		if (!normalized) {
			throw new Error("Client name cannot be empty");
		}

		const existingClient = await ctx
			.table("clients")
			.search("name", (q) => q.search("name", normalized).eq("userId", userId))
			.first();

		if (
			existingClient &&
			existingClient.name.toLowerCase() === normalized.toLowerCase()
		) {
			nextClientId = existingClient._id;
		} else {
			nextClientId = await ctx.table("clients").insert({
				name: normalized,
				userId,
				updated_at: Date.now(),
			});
		}
	}

	let currentProject: Ent<"projects"> | null = null;
	if (timeEntry.projectId) {
		currentProject = await ctx.table("projects").get(timeEntry.projectId);
	}

	await timeEntry.patch({
		clientId: nextClientId,
		projectId:
			nextClientId === undefined
				? timeEntry.projectId
				: currentProject?.clientId === nextClientId
					? timeEntry.projectId
					: undefined,
		updated_at: Date.now(),
	});

	return timeEntry;
}

export async function updateProject(
	ctx: MutationCtx,
	{ timeEntryId, userId, projectId, newProjectName }: UpdateProjectParams,
) {
	const timeEntry = await ctx.table("time_entries").getX(timeEntryId);

	if (timeEntry.userId !== userId) {
		throw new Error("Time entry does not belong to user");
	}

	if (projectId && newProjectName) {
		throw new Error("Provide exactly one of projectId or newProjectName");
	}

	let nextProjectId = projectId;

	if (!nextProjectId && newProjectName) {
		const normalized = newProjectName.trim();
		if (!normalized) {
			throw new Error("Client name cannot be empty");
		}

		const existingProject = await ctx
			.table("projects")
			.search("name", (q) => q.search("name", normalized).eq("userId", userId))
			.first();

		if (
			existingProject &&
			existingProject.name.toLowerCase() === normalized.toLowerCase()
		) {
			nextProjectId = existingProject._id;
		} else {
			nextProjectId = await ctx.table("projects").insert({
				name: normalized,
				userId,
				clientId: timeEntry.clientId,
				status: "active",
				updated_at: Date.now(),
			});
		}
	}

	await timeEntry.patch({ projectId: nextProjectId, updated_at: Date.now() });

	return timeEntry;
}

export async function updateCategory(
	ctx: MutationCtx,
	{ timeEntryId, userId, categoryId, newCategoryName }: UpdateCategoryParams,
) {
	const timeEntry = await ctx.table("time_entries").getX(timeEntryId);

	if (timeEntry.userId !== userId) {
		throw new Error("Time entry does not belong to user");
	}

	if (categoryId && newCategoryName) {
		throw new Error("Provide exactly one of categoryId or newCategoryName");
	}

	let nextCategoryId = categoryId;

	if (!nextCategoryId && newCategoryName) {
		const normalized = newCategoryName.trim();
		if (!normalized) {
			throw new Error("Client name cannot be empty");
		}

		const existingCategory = await ctx
			.table("categories")
			.search("name", (q) => q.search("name", normalized).eq("userId", userId))
			.first();

		if (
			existingCategory &&
			existingCategory.name.toLowerCase() === normalized.toLowerCase()
		) {
			nextCategoryId = existingCategory._id;
		} else {
			nextCategoryId = await ctx.table("categories").insert({
				name: normalized,
				userId,
				updated_at: Date.now(),
			});
		}
	}

	await timeEntry.patch({
		categoryId: nextCategoryId,
		updated_at: Date.now(),
	});

	return timeEntry;
}

export async function getRunningTimer(
	ctx: QueryCtx,
	{ userId }: { userId: Id<"users"> },
) {
	const entry = await ctx
		.table("time_entries", "by_user_end_time", (q) =>
			q.eq("userId", userId).eq("end_time", undefined),
		)
		.first();
	if (!entry) return null;

	const [client, project, category, tags] = await Promise.all([
		entry.edge("client"),
		entry.edge("project"),
		entry.edge("category"),
		entry.edge("tags"),
	]);
	return {
		...omit(entry as Doc<"time_entries">, ["userId"]),
		client: client ? omit(client as Doc<"clients">, ["userId"]) : null,
		project: project
			? omit(project as Doc<"projects">, ["userId", "clientId"])
			: null,
		category: category ? omit(category as Doc<"categories">, ["userId"]) : null,
		tags: tags.map((tag) => omit(tag as Doc<"tags">, ["userId"])),
	};
}

export async function getRecentProjects(
	ctx: QueryCtx,
	{ userId, limit }: { userId: Id<"users">; limit: number },
) {
	const recentEntries = await ctx
		.table("time_entries", "userId", (q) => q.eq("userId", userId))
		.order("desc")
		.take(20);

	const seen = new Set<string>();
	const results = [];
	for (const entry of recentEntries) {
		if (results.length >= limit) break;
		if (!entry.projectId) continue;
		if (seen.has(entry.projectId)) continue;
		seen.add(entry.projectId);
		const [project, client] = await Promise.all([
			entry.edge("project"),
			entry.edge("client"),
		]);
		if (!project) continue;
		results.push({
			projectId: project._id,
			projectName: project.name,
			clientId: client?._id,
			clientName: client?.name,
			categoryId: entry.categoryId,
			categoryName: undefined,
			lastEntryName: entry.name,
		});
	}
	return results;
}

export async function bulkDelete(
	ctx: MutationCtx,
	{ ids, userId }: { ids: Id<"time_entries">[]; userId: Id<"users"> },
) {
	for (const id of ids) {
		const entry = await ctx.table("time_entries").getX(id);
		if (entry.userId !== userId) {
			throw new Error("Time entry does not belong to user");
		}
		await entry.delete();
	}
}

export async function bulkUpdate(
	ctx: MutationCtx,
	{
		ids,
		userId,
		clientId,
		projectId,
		categoryId,
	}: {
		ids: Id<"time_entries">[];
		userId: Id<"users">;
		clientId?: Id<"clients">;
		projectId?: Id<"projects">;
		categoryId?: Id<"categories">;
	},
) {
	const patch: Record<string, unknown> = { updated_at: Date.now() };
	if (clientId !== undefined) patch.clientId = clientId;
	if (projectId !== undefined) patch.projectId = projectId;
	if (categoryId !== undefined) patch.categoryId = categoryId;

	for (const id of ids) {
		const entry = await ctx.table("time_entries").getX(id);
		if (entry.userId !== userId) {
			throw new Error("Time entry does not belong to user");
		}
		await entry.patch(patch);
	}
}

type Filters = SearchTimeEntriesParams["filters"];

function buildFilteredQuery(
	ctx: QueryCtx,
	userId: Id<"users">,
	filters?: Filters,
): EntQuery<"time_entries"> | null {
	let timeEntries: EntQuery<"time_entries"> | null = null;

	const nameQuery = (filters?.name ?? "").trim();
	const hasName = nameQuery.length > 0;
	const { startDate, endDate } = filters?.dateRange ?? {};

	const clientIds = filters?.clientIds ?? [];
	const projectIds = filters?.projectIds ?? [];
	const categoryIds = filters?.categoryIds ?? [];

	if (hasName) {
		timeEntries = ctx.table("time_entries").search("name", (q) => {
			let s = q.search("name", nameQuery).eq("userId", userId);

			// Search index .eq() only supports single values; use first ID for index, filter rest
			if (clientIds.length === 1) s = s.eq("clientId", clientIds[0]);
			if (projectIds.length === 1) s = s.eq("projectId", projectIds[0]);
			if (categoryIds.length === 1) s = s.eq("categoryId", categoryIds[0]);

			return s;
		});
	} else if (startDate !== undefined) {
		timeEntries = ctx
			.table("time_entries", "by_user_start_time", (q) =>
				q.eq("userId", userId).gte("start_time", startDate),
			)
			.order("asc");
	} else if (endDate !== undefined) {
		timeEntries = ctx
			.table("time_entries", "by_user_end_time", (q) =>
				q.eq("userId", userId).lte("end_time", endDate),
			)
			.order("desc");
	} else if (clientIds.length === 1) {
		timeEntries = ctx
			.table("time_entries", "by_user_and_client", (q) =>
				q.eq("userId", userId).eq("clientId", clientIds[0]),
			)
			.order("desc");
	} else if (projectIds.length === 1) {
		timeEntries = ctx
			.table("time_entries", "by_user_and_project", (q) =>
				q.eq("userId", userId).eq("projectId", projectIds[0]),
			)
			.order("desc");
	} else if (categoryIds.length === 1) {
		timeEntries = ctx
			.table("time_entries", "by_user_and_category", (q) =>
				q.eq("userId", userId).eq("categoryId", categoryIds[0]),
			)
			.order("desc");
	} else {
		timeEntries = ctx
			.table("time_entries", "userId", (q) => q.eq("userId", userId))
			.order("desc");
	}

	// Apply array filters via .filter() for multi-select (OR logic)
	if (!hasName) {
		if (clientIds.length > 0) {
			timeEntries = timeEntries.filter((q) => {
				let expr = q.eq(q.field("clientId"), clientIds[0]);
				for (let i = 1; i < clientIds.length; i++) {
					expr = q.or(expr, q.eq(q.field("clientId"), clientIds[i]));
				}
				return expr;
			});
		}
		if (projectIds.length > 0) {
			timeEntries = timeEntries.filter((q) => {
				let expr = q.eq(q.field("projectId"), projectIds[0]);
				for (let i = 1; i < projectIds.length; i++) {
					expr = q.or(expr, q.eq(q.field("projectId"), projectIds[i]));
				}
				return expr;
			});
		}
		if (categoryIds.length > 0) {
			timeEntries = timeEntries.filter((q) => {
				let expr = q.eq(q.field("categoryId"), categoryIds[0]);
				for (let i = 1; i < categoryIds.length; i++) {
					expr = q.or(expr, q.eq(q.field("categoryId"), categoryIds[i]));
				}
				return expr;
			});
		}
	} else {
		// For name search with multiple IDs, filter in-memory for the additional IDs
		if (clientIds.length > 1) {
			timeEntries = timeEntries.filter((q) => {
				let expr = q.eq(q.field("clientId"), clientIds[0]);
				for (let i = 1; i < clientIds.length; i++) {
					expr = q.or(expr, q.eq(q.field("clientId"), clientIds[i]));
				}
				return expr;
			});
		}
		if (projectIds.length > 1) {
			timeEntries = timeEntries.filter((q) => {
				let expr = q.eq(q.field("projectId"), projectIds[0]);
				for (let i = 1; i < projectIds.length; i++) {
					expr = q.or(expr, q.eq(q.field("projectId"), projectIds[i]));
				}
				return expr;
			});
		}
		if (categoryIds.length > 1) {
			timeEntries = timeEntries.filter((q) => {
				let expr = q.eq(q.field("categoryId"), categoryIds[0]);
				for (let i = 1; i < categoryIds.length; i++) {
					expr = q.or(expr, q.eq(q.field("categoryId"), categoryIds[i]));
				}
				return expr;
			});
		}
	}

	if (startDate !== undefined) {
		timeEntries = timeEntries.filter((q) =>
			q.gte(q.field("start_time"), getStartOfDay(startDate)),
		);
	}

	if (endDate !== undefined) {
		timeEntries = timeEntries.filter((q) =>
			q.lte(q.field("end_time"), getEndOfDay(endDate)),
		);
	}

	return timeEntries;
}

export async function searchTimeEntries(
	ctx: QueryCtx,
	{ userId, filters, include, paginationOpts }: SearchTimeEntriesParams,
) {
	const timeEntries = buildFilteredQuery(ctx, userId, filters);

	if (!timeEntries) {
		return { page: [], continueCursor: "", isDone: true };
	}

	const { page: paginatedTimeEntries, ...restPagination } =
		await timeEntries.paginate(paginationOpts);

	const includeClient = include?.client !== false;
	const includeProject = include?.project !== false;
	const includeCategory = include?.category === true;
	const includeTags = include?.tags === true;

	const finalPage = await Promise.all(
		paginatedTimeEntries.map(async (timeEntry) => {
			const [client, project, category, tags] = await Promise.all([
				includeClient ? timeEntry.edge("client") : (null as null),
				includeProject ? timeEntry.edge("project") : (null as null),
				includeCategory ? timeEntry.edge("category") : (null as null),
				includeTags
					? timeEntry.edge("tags")
					: ([] as Awaited<ReturnType<typeof timeEntry.edge<"tags">>>),
			]);
			return {
				...omit(timeEntry as Doc<"time_entries">, ["userId"]),
				client: client ? omit(client as Doc<"clients">, ["userId"]) : null,
				project: project
					? omit(project as Doc<"projects">, ["userId", "clientId"])
					: null,
				category: category
					? omit(category as Doc<"categories">, ["userId"])
					: null,
				tags: tags.map((tag) => omit(tag as Doc<"tags">, ["userId"])),
			};
		}),
	);

	return {
		page: finalPage,
		...restPagination,
	};
}

export async function getAllTimeEntries(
	ctx: QueryCtx,
	{ userId, filters }: { userId: Id<"users">; filters?: Filters },
) {
	const query = buildFilteredQuery(ctx, userId, filters);

	if (!query) {
		return [];
	}

	const entries = await query;

	return Promise.all(
		entries.map(async (entry) => {
			const [client, project, category] = await Promise.all([
				entry.edge("client"),
				entry.edge("project"),
				entry.edge("category"),
			]);
			return {
				...omit(entry as Doc<"time_entries">, ["userId"]),
				client: client ? omit(client as Doc<"clients">, ["userId"]) : null,
				project: project
					? omit(project as Doc<"projects">, ["userId", "clientId"])
					: null,
				category: category
					? omit(category as Doc<"categories">, ["userId"])
					: null,
			};
		}),
	);
}
