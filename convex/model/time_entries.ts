import type { PaginationOptions } from "convex/server";
import { omit } from "convex-helpers";

import type { Ent, EntQuery, QueryCtx, MutationCtx } from "../types";
import {
	computeNextTiming,
	getEndOfDay,
	getStartOfDay,
	updateIfDefined,
} from "../utils";
import type { Doc, Id } from "../_generated/dataModel";

interface SearchTimeEntriesParams {
	userId: Id<"users">;
	filters?: {
		name?: string;
		clientId?: Id<"clients">;
		projectId?: Id<"projects">;
		categoryId?: Id<"categories">;
		dateRange?: {
			startDate?: number;
			endDate?: number;
		};
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
		tagIds,
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

export async function searchTimeEntries(
	ctx: QueryCtx,
	{ userId, filters, paginationOpts }: SearchTimeEntriesParams,
) {
	let timeEntries: EntQuery<"time_entries"> | null = null;

	const nameQuery = (filters?.name ?? "").trim();
	const hasName = nameQuery.length > 0;
	const { startDate, endDate } = filters?.dateRange ?? {};

	if (hasName) {
		timeEntries = ctx.table("time_entries").search("name", (q) => {
			let s = q.search("name", nameQuery).eq("userId", userId);

			if (filters?.clientId) s = s.eq("clientId", filters?.clientId);
			if (filters?.projectId) s = s.eq("projectId", filters?.projectId);
			if (filters?.categoryId) s = s.eq("categoryId", filters?.categoryId);

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
	} else if (filters?.clientId) {
		timeEntries = ctx
			.table("time_entries", "by_user_and_client", (q) =>
				q.eq("userId", userId).eq("clientId", filters.clientId),
			)
			.order("desc");
	} else if (filters?.projectId) {
		timeEntries = ctx
			.table("time_entries", "by_user_and_project", (q) =>
				q.eq("userId", userId).eq("projectId", filters.projectId),
			)
			.order("desc");
	} else if (filters?.categoryId) {
		timeEntries = ctx
			.table("time_entries", "by_user_and_category", (q) =>
				q.eq("userId", userId).eq("categoryId", filters.categoryId),
			)
			.order("desc");
	} else {
		timeEntries = ctx
			.table("time_entries", "userId", (q) => q.eq("userId", userId))
			.order("desc");
	}

	// Apply remaining filters without requiring composite indexes
	if (!hasName) {
		if (filters?.projectId) {
			// already covered by index when chosen; if a different index used, filter here
			timeEntries = timeEntries.filter((q) =>
				q.eq(q.field("projectId"), filters.projectId),
			);
		}
		if (filters?.clientId) {
			timeEntries = timeEntries.filter((q) =>
				q.eq(q.field("clientId"), filters.clientId),
			);
		}
		if (filters?.categoryId) {
			timeEntries = timeEntries.filter((q) =>
				q.eq(q.field("categoryId"), filters.categoryId),
			);
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

	if (!timeEntries) {
		return { page: [], continueCursor: "", isDone: true };
	}

	const { page: paginatedTimeEntries, ...restPagination } =
		await timeEntries.paginate(paginationOpts);

	const finalPage = await Promise.all(
		paginatedTimeEntries.map(async (timeEntry) => {
			const [client, project, category, tags] = await Promise.all([
				timeEntry.edge("client"),
				timeEntry.edge("project"),
				timeEntry.edge("category"),
				timeEntry.edge("tags"),
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
