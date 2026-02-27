import { omit } from "convex-helpers";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../types";
import { getEndOfDay, getStartOfDay } from "../utils";
import { assertOwnership } from "./helpers";
import { buildRateCaches, isBillable, resolveRateFromCaches } from "./rates";
import * as UserSettings from "./user_settings";

type GroupByDimension = "client" | "project" | "category" | "name";

interface GroupingRule {
	group_by: GroupByDimension;
}

interface LineItem {
	label: string;
	duration_ms: number;
	rate_cents: number;
	amount_cents: number;
	group_key?: string;
}

interface EntryWithRelations {
	_id: string;
	name: string;
	duration?: number;
	start_time?: number;
	end_time?: number;
	clientId?: Id<"clients">;
	projectId?: Id<"projects">;
	categoryId?: Id<"categories">;
	billable?: boolean;
	clientName?: string;
	projectName?: string;
	categoryName?: string;
}

function formatDurationLabel(ms: number): string {
	const totalMinutes = Math.round(ms / 60000);
	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;
	return `${hours}h ${String(minutes).padStart(2, "0")}m`;
}

function formatDateRange(startMs: number, endMs: number): string {
	const start = new Date(startMs);
	const end = new Date(endMs);
	const opts: Intl.DateTimeFormatOptions = {
		month: "short",
		day: "numeric",
		year: "numeric",
	};
	return `${start.toLocaleDateString("en-US", opts)} - ${end.toLocaleDateString("en-US", opts)}`;
}

function getGroupValue(
	entry: EntryWithRelations,
	dimension: GroupByDimension,
): string {
	switch (dimension) {
		case "client":
			return entry.clientName ?? "No Client";
		case "project":
			return entry.projectName ?? "No Project";
		case "category":
			return entry.categoryName ?? "No Category";
		case "name":
			return entry.name;
	}
}

function getGroupId(
	entry: EntryWithRelations,
	dimension: GroupByDimension,
): string {
	switch (dimension) {
		case "client":
			return entry.clientId ?? "none";
		case "project":
			return entry.projectId ?? "none";
		case "category":
			return entry.categoryId ?? "none";
		case "name":
			return entry.name;
	}
}

interface GroupNode {
	key: string;
	label: string;
	entries: EntryWithRelations[];
	duration_ms: number;
	amount_cents: number;
	children: GroupNode[];
}

function buildGroupTree(
	entries: EntryWithRelations[],
	rules: GroupingRule[],
	rateResolver: (entry: EntryWithRelations) => number,
	mergeEntries: boolean,
	depth = 0,
): GroupNode[] {
	if (depth >= rules.length) {
		// Leaf level: create individual or merged entries
		if (mergeEntries) {
			if (rules.length > 0) {
				// Parent group exists — return empty to signal parent should aggregate directly
				return [];
			}
			// No grouping rules at all — aggregate everything into a single "Total" node
			let totalDuration = 0;
			let totalAmount = 0;
			for (const entry of entries) {
				const dur = entry.duration ?? 0;
				const rate = rateResolver(entry);
				totalDuration += dur;
				totalAmount += Math.round((dur / 3600000) * rate);
			}
			return [
				{
					key: "total",
					label: "Total",
					entries,
					duration_ms: totalDuration,
					amount_cents: totalAmount,
					children: [],
				},
			];
		}
		return entries.map((entry) => {
			const dur = entry.duration ?? 0;
			const rate = rateResolver(entry);
			return {
				key: entry._id,
				label: entry.name,
				entries: [entry],
				duration_ms: dur,
				amount_cents: Math.round((dur / 3600000) * rate),
				children: [],
			};
		});
	}

	const rule = rules[depth];
	const groups = new Map<string, EntryWithRelations[]>();
	const labelMap = new Map<string, string>();

	for (const entry of entries) {
		const gId = getGroupId(entry, rule.group_by);
		const gLabel = getGroupValue(entry, rule.group_by);
		labelMap.set(gId, gLabel);
		const arr = groups.get(gId);
		if (arr) arr.push(entry);
		else groups.set(gId, [entry]);
	}

	const nodes: GroupNode[] = [];
	for (const [gId, gEntries] of groups) {
		const children = buildGroupTree(
			gEntries,
			rules,
			rateResolver,
			mergeEntries,
			depth + 1,
		);
		let duration_ms: number;
		let amount_cents: number;
		if (children.length === 0) {
			// Merge collapsed leaf level — aggregate directly from entries
			duration_ms = 0;
			amount_cents = 0;
			for (const entry of gEntries) {
				const dur = entry.duration ?? 0;
				const rate = rateResolver(entry);
				duration_ms += dur;
				amount_cents += Math.round((dur / 3600000) * rate);
			}
		} else {
			duration_ms = children.reduce((sum, c) => sum + c.duration_ms, 0);
			amount_cents = children.reduce((sum, c) => sum + c.amount_cents, 0);
		}
		nodes.push({
			key: gId,
			label: labelMap.get(gId) ?? gId,
			entries: gEntries,
			duration_ms,
			amount_cents,
			children,
		});
	}

	return nodes;
}

function flattenToLineItems(
	nodes: GroupNode[],
	rules: GroupingRule[],
	includeDateRange: boolean,
	includeDuration: boolean,
	startDate: number,
	endDate: number,
	depth = 0,
	parentLabels: string[] = [],
): LineItem[] {
	const items: LineItem[] = [];

	for (const node of nodes) {
		if (node.children.length > 0) {
			// Recurse into children with accumulated labels
			const childItems = flattenToLineItems(
				node.children,
				rules,
				includeDateRange,
				includeDuration,
				startDate,
				endDate,
				depth + 1,
				[...parentLabels, node.label],
			);
			items.push(...childItems);
		} else {
			// Leaf node — build the line item label
			const parts: string[] = [];
			if (includeDateRange) {
				parts.push(formatDateRange(startDate, endDate));
			}
			if (includeDuration) {
				parts.push(formatDurationLabel(node.duration_ms));
			}
			// Add all parent labels and current label
			const allLabels = [...parentLabels, node.label];
			parts.push(allLabels.join(" for "));

			const label = parts.join(", ");
			const rate =
				node.entries.length > 0
					? Math.round(node.amount_cents / (node.duration_ms / 3600000)) || 0
					: 0;

			items.push({
				label,
				duration_ms: node.duration_ms,
				rate_cents: rate,
				amount_cents: node.amount_cents,
				group_key: allLabels.join("/"),
			});
		}
	}

	return items;
}

export async function previewLineItems(
	ctx: QueryCtx,
	{
		userId,
		startDate,
		endDate,
		clientId,
		groupingRules,
		mergeEntries,
		includeDateRange,
		includeDuration,
	}: {
		userId: Id<"users">;
		startDate: number;
		endDate: number;
		clientId?: Id<"clients">;
		groupingRules: GroupingRule[];
		mergeEntries: boolean;
		includeDateRange: boolean;
		includeDuration: boolean;
	},
) {
	// Fetch all time entries in range (normalize to full days)
	const entries = await ctx
		.table("time_entries", "by_user_start_time", (q) =>
			q.eq("userId", userId).gte("start_time", getStartOfDay(startDate)),
		)
		.filter((q) => q.lte(q.field("start_time"), getEndOfDay(endDate)));

	// Get user settings for default rate
	const settings = await UserSettings.get(ctx, { userId });
	const defaultRate = settings?.default_hourly_rate ?? 0;

	// Filter to billable entries only and optionally by client
	const billableEntries: EntryWithRelations[] = [];
	const rawEntries = [];
	for (const entry of entries) {
		if (!isBillable(entry)) continue;
		if (clientId && entry.clientId !== clientId) continue;
		rawEntries.push(entry);
	}

	// Build rate caches
	const { clientCache, projectCache } = await buildRateCaches(ctx, rawEntries);

	// Fetch relation names
	const clientNameCache = new Map<string, string>();
	const projectNameCache = new Map<string, string>();
	const categoryNameCache = new Map<string, string>();

	for (const entry of rawEntries) {
		if (entry.clientId && !clientNameCache.has(entry.clientId)) {
			const client = await ctx.table("clients").get(entry.clientId);
			clientNameCache.set(entry.clientId, client?.name ?? "Unknown");
		}
		if (entry.projectId && !projectNameCache.has(entry.projectId)) {
			const project = await ctx.table("projects").get(entry.projectId);
			projectNameCache.set(entry.projectId, project?.name ?? "Unknown");
		}
		if (entry.categoryId && !categoryNameCache.has(entry.categoryId)) {
			const category = await ctx.table("categories").get(entry.categoryId);
			categoryNameCache.set(entry.categoryId, category?.name ?? "Unknown");
		}

		billableEntries.push({
			_id: entry._id,
			name: entry.name,
			duration: entry.duration,
			start_time: entry.start_time,
			end_time: entry.end_time,
			clientId: entry.clientId,
			projectId: entry.projectId,
			categoryId: entry.categoryId,
			billable: entry.billable,
			clientName: entry.clientId
				? clientNameCache.get(entry.clientId)
				: undefined,
			projectName: entry.projectId
				? projectNameCache.get(entry.projectId)
				: undefined,
			categoryName: entry.categoryId
				? categoryNameCache.get(entry.categoryId)
				: undefined,
		});
	}

	const rateResolver = (entry: EntryWithRelations) =>
		resolveRateFromCaches(entry, clientCache, projectCache, defaultRate);

	// Build group tree
	const groupTree = buildGroupTree(
		billableEntries,
		groupingRules,
		rateResolver,
		mergeEntries,
	);

	// Flatten to line items
	const lineItems = flattenToLineItems(
		groupTree,
		groupingRules,
		includeDateRange,
		includeDuration,
		startDate,
		endDate,
	);

	const subtotal_cents = lineItems.reduce(
		(sum, item) => sum + item.amount_cents,
		0,
	);
	const total_duration_ms = lineItems.reduce(
		(sum, item) => sum + item.duration_ms,
		0,
	);

	return {
		lineItems,
		subtotal_cents,
		total_duration_ms,
		entry_count: billableEntries.length,
		groupTree,
	};
}

export async function create(
	ctx: MutationCtx,
	{
		userId,
		number: invoiceNumber,
		clientId,
		startDate,
		endDate,
		lineItems,
		subtotal_cents,
		notes,
	}: {
		userId: Id<"users">;
		number?: string;
		clientId?: Id<"clients">;
		startDate: number;
		endDate: number;
		lineItems: LineItem[];
		subtotal_cents: number;
		notes?: string;
	},
) {
	return ctx.table("invoices").insert({
		number: invoiceNumber,
		clientId,
		userId,
		start_date: startDate,
		end_date: endDate,
		line_items: lineItems,
		subtotal_cents,
		notes,
		updated_at: Date.now(),
	});
}

export async function update(
	ctx: MutationCtx,
	{
		id,
		userId,
		number: invoiceNumber,
		notes,
		lineItems,
		subtotal_cents,
	}: {
		id: Id<"invoices">;
		userId: Id<"users">;
		number?: string;
		notes?: string;
		lineItems?: LineItem[];
		subtotal_cents?: number;
	},
) {
	const invoice = await ctx.table("invoices").getX(id);
	assertOwnership(invoice, userId, "Invoice");

	const updates: Record<string, unknown> = { updated_at: Date.now() };
	if (invoiceNumber !== undefined) updates.number = invoiceNumber;
	if (notes !== undefined) updates.notes = notes;
	if (lineItems !== undefined) updates.line_items = lineItems;
	if (subtotal_cents !== undefined) updates.subtotal_cents = subtotal_cents;

	await invoice.patch(updates);
}

export async function deleteOne(
	ctx: MutationCtx,
	{ id, userId }: { id: Id<"invoices">; userId: Id<"users"> },
) {
	const invoice = await ctx.table("invoices").getX(id);
	assertOwnership(invoice, userId, "Invoice");
	await invoice.delete();
}

export async function list(
	ctx: QueryCtx,
	{ userId }: { userId: Id<"users"> },
) {
	const invoices = await ctx
		.table("invoices", "userId", (q) => q.eq("userId", userId))
		.order("desc")
		.map(async (invoice) => {
			const client = invoice.clientId
				? await ctx.table("clients").get(invoice.clientId)
				: null;
			return {
				...omit(invoice.doc(), ["userId"]),
				clientName: client?.name ?? null,
			};
		});
	return invoices;
}

export async function getById(
	ctx: QueryCtx,
	{ id, userId }: { id: Id<"invoices">; userId: Id<"users"> },
) {
	const invoice = await ctx.table("invoices").getX(id);
	assertOwnership(invoice, userId, "Invoice");
	const client = invoice.clientId
		? await ctx.table("clients").get(invoice.clientId)
		: null;
	return {
		...omit(invoice.doc(), ["userId"]),
		clientName: client?.name ?? null,
	};
}

export async function getLastEndDate(
	ctx: QueryCtx,
	{ userId, clientId }: { userId: Id<"users">; clientId?: Id<"clients"> },
) {
	const invoices = await ctx
		.table("invoices", "by_user_and_end_date", (q) => q.eq("userId", userId))
		.order("desc");

	const match = clientId
		? invoices.find((inv) => inv.clientId === clientId)
		: invoices[0];

	return match?.end_date ?? null;
}

export async function getUnbilledTotal(
	ctx: QueryCtx,
	{ userId }: { userId: Id<"users"> },
) {
	// Find the latest invoice end date
	const lastEndDate = await getLastEndDate(ctx, { userId });
	const sinceDate = lastEndDate ? lastEndDate + 1 : 0;

	// Fetch billable entries since last invoice
	const entries = await ctx
		.table("time_entries", "by_user_start_time", (q) =>
			q.eq("userId", userId).gte("start_time", sinceDate),
		)
		.filter((q) => q.neq(q.field("end_time"), undefined));

	const billableEntries = entries.filter((e) => isBillable(e));
	if (billableEntries.length === 0) {
		return { amount_cents: 0, duration_ms: 0, entry_count: 0 };
	}

	const { clientCache, projectCache } = await buildRateCaches(
		ctx,
		billableEntries,
	);
	const settings = await UserSettings.get(ctx, { userId });
	const defaultRate = settings?.default_hourly_rate ?? 0;

	let totalAmount = 0;
	let totalDuration = 0;
	for (const entry of billableEntries) {
		const dur = entry.duration ?? 0;
		const rate = resolveRateFromCaches(
			entry,
			clientCache,
			projectCache,
			defaultRate,
		);
		totalDuration += dur;
		totalAmount += Math.round((dur / 3600000) * rate);
	}

	return {
		amount_cents: totalAmount,
		duration_ms: totalDuration,
		entry_count: billableEntries.length,
	};
}
