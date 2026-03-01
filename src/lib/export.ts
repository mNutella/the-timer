import { formatDuration } from "./utils";

export type ExportFormat = "csv" | "json";
export type ExportMode = "detailed" | "merged" | "summary";
export type ExportGroupBy = "none" | "client" | "project" | "category" | "date";

export interface ExportConfig {
	format: ExportFormat;
	mode: ExportMode;
	groupBy: ExportGroupBy;
}

interface ExportEntry {
	_id: string;
	name: string;
	description?: string;
	notes?: string;
	start_time?: number;
	end_time?: number;
	duration?: number;
	client: { _id: string; name: string } | null;
	project: { _id: string; name: string } | null;
	category: { _id: string; name: string } | null;
}

function formatDate(timestamp?: number): string {
	if (!timestamp) return "";
	return new Date(timestamp).toLocaleDateString("en-US", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	});
}

function formatTime(timestamp?: number): string {
	if (!timestamp) return "";
	return new Date(timestamp).toLocaleTimeString("en-US", {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hour12: false,
	});
}

function getEntryDuration(entry: ExportEntry, now: number): number {
	if (entry.duration !== undefined) return entry.duration;
	if (entry.start_time && !entry.end_time) return now - entry.start_time;
	return 0;
}

function durationToDecimalHours(ms: number): string {
	return (ms / 3_600_000).toFixed(2);
}

function getGroupKey(entry: ExportEntry, groupBy: ExportGroupBy): string {
	switch (groupBy) {
		case "client":
			return entry.client?.name ?? "(No Client)";
		case "project":
			return entry.project?.name ?? "(No Project)";
		case "category":
			return entry.category?.name ?? "(No Category)";
		case "date":
			return formatDate(entry.start_time) || "(No Date)";
		default:
			return "All Entries";
	}
}

export function generateDetailedRows(
	entries: ExportEntry[],
	groupBy: ExportGroupBy,
	now: number,
): { headers: string[]; rows: string[][] } {
	const headers = [
		"Name",
		"Client",
		"Project",
		"Category",
		"Date",
		"Start Time",
		"End Time",
		"Duration",
		"Notes",
	];

	const sorted = [...entries].sort((a, b) => {
		if (groupBy !== "none") {
			const groupA = getGroupKey(a, groupBy);
			const groupB = getGroupKey(b, groupBy);
			const cmp = groupA.localeCompare(groupB);
			if (cmp !== 0) return cmp;
		}
		return (b.start_time ?? 0) - (a.start_time ?? 0);
	});

	const rows = sorted.map((entry) => [
		entry.name,
		entry.client?.name ?? "",
		entry.project?.name ?? "",
		entry.category?.name ?? "",
		formatDate(entry.start_time),
		formatTime(entry.start_time),
		entry.end_time ? formatTime(entry.end_time) : "In Progress",
		formatDuration(getEntryDuration(entry, now)),
		entry.notes ?? "",
	]);

	return { headers, rows };
}

export function generateSummaryRows(
	entries: ExportEntry[],
	groupBy: ExportGroupBy,
	now: number,
): { headers: string[]; rows: string[][] } {
	const headers = ["Group", "Total Duration", "Total Hours", "Entry Count"];

	const groups = new Map<string, { totalMs: number; count: number }>();

	for (const entry of entries) {
		const key = getGroupKey(entry, groupBy);
		const existing = groups.get(key) ?? { totalMs: 0, count: 0 };
		existing.totalMs += getEntryDuration(entry, now);
		existing.count += 1;
		groups.set(key, existing);
	}

	const rows = Array.from(groups.entries())
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([group, { totalMs, count }]) => [
			group,
			formatDuration(totalMs),
			durationToDecimalHours(totalMs),
			String(count),
		]);

	return { headers, rows };
}

interface MergedGroup {
	name: string;
	client: string;
	project: string;
	category: string;
	date: string;
	totalMs: number;
	count: number;
}

export function generateMergedRows(
	entries: ExportEntry[],
	groupBy: ExportGroupBy,
	now: number,
): { headers: string[]; rows: string[][] } {
	const includeDate = groupBy === "date";
	const headers = [
		"Name",
		"Client",
		"Project",
		"Category",
		...(includeDate ? ["Date"] : []),
		"Total Duration",
		"Total Hours",
		"Entry Count",
	];

	const groups = new Map<string, MergedGroup>();

	for (const entry of entries) {
		const name = entry.name;
		const client = entry.client?.name ?? "";
		const project = entry.project?.name ?? "";
		const category = entry.category?.name ?? "";
		const date = formatDate(entry.start_time);
		const key = includeDate
			? `${date}\0${name}\0${client}\0${project}\0${category}`
			: `${name}\0${client}\0${project}\0${category}`;

		const existing = groups.get(key);
		if (existing) {
			existing.totalMs += getEntryDuration(entry, now);
			existing.count += 1;
		} else {
			groups.set(key, {
				name,
				client,
				project,
				category,
				date,
				totalMs: getEntryDuration(entry, now),
				count: 1,
			});
		}
	}

	const groupDimField: Record<ExportGroupBy, keyof MergedGroup> = {
		client: "client",
		project: "project",
		category: "category",
		date: "date",
		none: "name",
	};
	const dimField = groupDimField[groupBy];

	const rows = Array.from(groups.values())
		.sort((a, b) => {
			if (groupBy !== "none") {
				const cmp = String(a[dimField]).localeCompare(String(b[dimField]));
				if (cmp !== 0) return cmp;
			}
			return b.totalMs - a.totalMs;
		})
		.map((g) => [
			g.name,
			g.client,
			g.project,
			g.category,
			...(includeDate ? [g.date] : []),
			formatDuration(g.totalMs),
			durationToDecimalHours(g.totalMs),
			String(g.count),
		]);

	return { headers, rows };
}

function escapeCsvField(field: string): string {
	if (field.includes(",") || field.includes('"') || field.includes("\n") || field.includes("\r")) {
		return `"${field.replace(/"/g, '""')}"`;
	}
	return field;
}

export function rowsToCsv(headers: string[], rows: string[][]): string {
	const lines = [
		headers.map(escapeCsvField).join(","),
		...rows.map((row) => row.map(escapeCsvField).join(",")),
	];
	return lines.join("\r\n");
}

function buildJsonEnvelope(
	entries: ExportEntry[],
	config: ExportConfig,
	data: Record<string, unknown>,
): string {
	return JSON.stringify(
		{
			exportedAt: new Date().toISOString(),
			totalEntries: entries.length,
			mode: config.mode,
			groupBy: config.groupBy,
			...data,
		},
		null,
		2,
	);
}

export function entriesToJson(entries: ExportEntry[], config: ExportConfig, now: number): string {
	if (config.mode === "summary") {
		const { rows } = generateSummaryRows(entries, config.groupBy, now);
		return buildJsonEnvelope(entries, config, {
			groups: rows.map(([group, duration, hours, count]) => ({
				name: group,
				totalDuration: duration,
				totalHours: Number(hours),
				entryCount: Number(count),
			})),
		});
	}

	if (config.mode === "merged") {
		const { rows } = generateMergedRows(entries, config.groupBy, now);
		return buildJsonEnvelope(entries, config, {
			entries: rows.map(([name, client, project, category, duration, hours, count]) => ({
				name,
				client: client || null,
				project: project || null,
				category: category || null,
				totalDuration: duration,
				totalHours: Number(hours),
				entryCount: Number(count),
			})),
		});
	}

	const { rows } = generateDetailedRows(entries, config.groupBy, now);
	return buildJsonEnvelope(entries, config, {
		entries: rows.map(([name, client, project, category, date, start, end, duration, notes]) => ({
			name,
			client: client || null,
			project: project || null,
			category: category || null,
			date,
			startTime: start,
			endTime: end || null,
			duration,
			notes: notes || null,
		})),
	});
}

const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

async function downloadFileTauri(content: string, filename: string, format: ExportFormat) {
	const { save } = await import("@tauri-apps/plugin-dialog");
	const { writeTextFile } = await import("@tauri-apps/plugin-fs");

	const filePath = await save({
		defaultPath: filename,
		filters: [
			format === "csv"
				? { name: "CSV", extensions: ["csv"] }
				: { name: "JSON", extensions: ["json"] },
		],
	});

	if (!filePath) return false;
	await writeTextFile(filePath, content);
	return true;
}

function downloadFileBrowser(content: string, filename: string) {
	const blob = new Blob([content], { type: "application/octet-stream" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	setTimeout(() => URL.revokeObjectURL(url), 100);
	return true;
}

export async function downloadFile(
	content: string,
	filename: string,
	format: ExportFormat,
): Promise<boolean> {
	if (isTauri) {
		return downloadFileTauri(content, filename, format);
	}
	return downloadFileBrowser(content, filename);
}

export function generateFilename(
	mode: ExportMode,
	groupBy: ExportGroupBy,
	format: ExportFormat,
): string {
	const date = new Date().toISOString().split("T")[0];
	const groupSuffix = groupBy !== "none" ? `-by-${groupBy}` : "";
	return `time-entries-${mode}${groupSuffix}-${date}.${format}`;
}

function generateRows(
	entries: ExportEntry[],
	mode: ExportMode,
	groupBy: ExportGroupBy,
	now: number,
): { headers: string[]; rows: string[][] } {
	switch (mode) {
		case "detailed":
			return generateDetailedRows(entries, groupBy, now);
		case "merged":
			return generateMergedRows(entries, groupBy, now);
		case "summary":
			return generateSummaryRows(entries, groupBy, now);
	}
}

export async function exportEntries(
	entries: ExportEntry[],
	config: ExportConfig,
): Promise<boolean> {
	const { format, mode, groupBy } = config;
	const now = Date.now();
	const filename = generateFilename(mode, groupBy, format);

	if (format === "json") {
		const content = entriesToJson(entries, config, now);
		return downloadFile(content, filename, format);
	}

	const { headers, rows } = generateRows(entries, mode, groupBy, now);
	const content = rowsToCsv(headers, rows);
	return downloadFile(content, filename, format);
}
