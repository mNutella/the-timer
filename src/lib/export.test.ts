import { describe, expect, it } from "vitest";

import {
	entriesToJson,
	generateDetailedRows,
	generateFilename,
	generateMergedRows,
	generateSummaryRows,
	rowsToCsv,
} from "./export";

// Shared test data factory
function makeEntry(overrides: Partial<Parameters<typeof Object.assign>[1]> = {}) {
	return {
		_id: "entry1",
		name: "Task A",
		description: undefined,
		notes: undefined,
		start_time: 1700000000000, // 2023-11-14T22:13:20Z
		end_time: 1700003600000, // +1 hour
		duration: 3_600_000,
		client: null,
		project: null,
		category: null,
		...overrides,
	};
}

const NOW = 1700010000000;

describe("generateDetailedRows", () => {
	it("generates correct headers and maps entry fields to row", () => {
		const entry = makeEntry({
			name: "Design work",
			client: { _id: "c1", name: "Acme" },
			project: { _id: "p1", name: "Website" },
			category: { _id: "cat1", name: "Development" },
			notes: "Some notes",
		});

		const { headers, rows } = generateDetailedRows([entry], "none", NOW);

		expect(headers).toEqual([
			"Name",
			"Client",
			"Project",
			"Category",
			"Date",
			"Start Time",
			"End Time",
			"Duration",
			"Notes",
		]);
		expect(rows).toHaveLength(1);
		expect(rows[0][0]).toBe("Design work");
		expect(rows[0][1]).toBe("Acme");
		expect(rows[0][2]).toBe("Website");
		expect(rows[0][3]).toBe("Development");
		expect(rows[0][8]).toBe("Some notes");
	});

	it("shows 'In Progress' for running entries and empty strings for null entities", () => {
		const entry = makeEntry({
			end_time: undefined,
			duration: undefined,
		});

		const { rows } = generateDetailedRows([entry], "none", NOW);

		expect(rows[0][1]).toBe(""); // client
		expect(rows[0][2]).toBe(""); // project
		expect(rows[0][3]).toBe(""); // category
		expect(rows[0][6]).toBe("In Progress");
		expect(rows[0][8]).toBe(""); // notes
	});

	it("sorts entries by start_time descending (newest first)", () => {
		const older = makeEntry({
			_id: "e1",
			name: "Old",
			start_time: 1700000000000,
		});
		const newer = makeEntry({
			_id: "e2",
			name: "New",
			start_time: 1700050000000,
		});

		const { rows } = generateDetailedRows([older, newer], "none", NOW);

		expect(rows[0][0]).toBe("New");
		expect(rows[1][0]).toBe("Old");
	});

	it("sorts by group key first when groupBy is set", () => {
		const entryA = makeEntry({
			_id: "e1",
			name: "Task 1",
			client: { _id: "c2", name: "Zebra Corp" },
			start_time: 1700050000000,
		});
		const entryB = makeEntry({
			_id: "e2",
			name: "Task 2",
			client: { _id: "c1", name: "Alpha Inc" },
			start_time: 1700000000000,
		});

		const { rows } = generateDetailedRows([entryA, entryB], "client", NOW);

		// Alpha Inc sorts before Zebra Corp
		expect(rows[0][0]).toBe("Task 2");
		expect(rows[1][0]).toBe("Task 1");
	});
});

describe("generateSummaryRows", () => {
	it("groups entries by client and sums durations", () => {
		const entries = [
			makeEntry({
				_id: "e1",
				client: { _id: "c1", name: "Acme" },
				duration: 3_600_000,
			}),
			makeEntry({
				_id: "e2",
				client: { _id: "c1", name: "Acme" },
				duration: 1_800_000,
			}),
			makeEntry({
				_id: "e3",
				client: { _id: "c2", name: "Beta" },
				duration: 7_200_000,
			}),
		];

		const { headers, rows } = generateSummaryRows(entries, "client", NOW);

		expect(headers).toEqual(["Group", "Total Duration", "Total Hours", "Entry Count"]);
		expect(rows).toHaveLength(2);

		// Alphabetical sort: Acme before Beta
		expect(rows[0][0]).toBe("Acme");
		expect(rows[0][3]).toBe("2"); // count
		expect(rows[1][0]).toBe("Beta");
		expect(rows[1][3]).toBe("1"); // count
	});

	it("uses '(No Client)' for entries without a client", () => {
		const entries = [makeEntry({ _id: "e1", client: null, duration: 1_000_000 })];

		const { rows } = generateSummaryRows(entries, "client", NOW);

		expect(rows[0][0]).toBe("(No Client)");
	});

	it("groups by date using formatted date string", () => {
		const entries = [
			makeEntry({ _id: "e1", start_time: 1700000000000, duration: 3_600_000 }),
			makeEntry({ _id: "e2", start_time: 1700000000000, duration: 1_800_000 }),
		];

		const { rows } = generateSummaryRows(entries, "date", NOW);

		expect(rows).toHaveLength(1);
		expect(rows[0][3]).toBe("2"); // both on same date
	});
});

describe("generateMergedRows", () => {
	it("merges entries with same name+client+project+category", () => {
		const entries = [
			makeEntry({
				_id: "e1",
				name: "Dev",
				client: { _id: "c1", name: "Acme" },
				duration: 3_600_000,
			}),
			makeEntry({
				_id: "e2",
				name: "Dev",
				client: { _id: "c1", name: "Acme" },
				duration: 1_800_000,
			}),
		];

		const { rows } = generateMergedRows(entries, "none", NOW);

		expect(rows).toHaveLength(1);
		expect(rows[0][0]).toBe("Dev"); // name
		expect(rows[0][1]).toBe("Acme"); // client
	});

	it("keeps entries separate when grouped by date and on different days", () => {
		const entries = [
			makeEntry({
				_id: "e1",
				name: "Dev",
				start_time: 1700000000000,
				duration: 3_600_000,
			}),
			makeEntry({
				_id: "e2",
				name: "Dev",
				start_time: 1700100000000,
				duration: 1_800_000,
			}),
		];

		const { headers, rows } = generateMergedRows(entries, "date", NOW);

		expect(headers).toContain("Date");
		expect(rows).toHaveLength(2);
	});

	it("does not include Date column when groupBy is not date", () => {
		const entries = [makeEntry()];

		const { headers } = generateMergedRows(entries, "client", NOW);

		expect(headers).not.toContain("Date");
	});
});

describe("rowsToCsv", () => {
	it("joins headers and rows with commas and CRLF", () => {
		const csv = rowsToCsv(["Name", "Value"], [["a", "b"]]);

		expect(csv).toBe("Name,Value\r\na,b");
	});

	it("quotes fields containing commas", () => {
		const csv = rowsToCsv(["Name"], [["hello, world"]]);

		expect(csv).toContain('"hello, world"');
	});

	it("escapes double quotes by doubling them", () => {
		const csv = rowsToCsv(["Name"], [['say "hi"']]);

		expect(csv).toContain('"say ""hi"""');
	});

	it("quotes fields containing newlines", () => {
		const csv = rowsToCsv(["Name"], [["line1\nline2"]]);

		expect(csv).toContain('"line1\nline2"');
	});
});

describe("entriesToJson", () => {
	it("generates detailed JSON with entries array", () => {
		const entries = [makeEntry({ name: "Task A" })];
		const config = {
			format: "json" as const,
			mode: "detailed" as const,
			groupBy: "none" as const,
		};

		const result = JSON.parse(entriesToJson(entries, config, NOW));

		expect(result.mode).toBe("detailed");
		expect(result.groupBy).toBe("none");
		expect(result.totalEntries).toBe(1);
		expect(result.entries).toHaveLength(1);
		expect(result.entries[0].name).toBe("Task A");
	});

	it("generates summary JSON with groups array", () => {
		const entries = [
			makeEntry({
				_id: "e1",
				client: { _id: "c1", name: "Acme" },
				duration: 3_600_000,
			}),
			makeEntry({
				_id: "e2",
				client: { _id: "c1", name: "Acme" },
				duration: 1_800_000,
			}),
		];
		const config = {
			format: "json" as const,
			mode: "summary" as const,
			groupBy: "client" as const,
		};

		const result = JSON.parse(entriesToJson(entries, config, NOW));

		expect(result.groups).toHaveLength(1);
		expect(result.groups[0].name).toBe("Acme");
		expect(result.groups[0].entryCount).toBe(2);
		expect(result.groups[0].totalHours).toBeCloseTo(1.5, 1);
	});

	it("generates merged JSON with entries array containing totals", () => {
		const entries = [
			makeEntry({ _id: "e1", name: "Dev", duration: 3_600_000 }),
			makeEntry({ _id: "e2", name: "Dev", duration: 1_800_000 }),
		];
		const config = {
			format: "json" as const,
			mode: "merged" as const,
			groupBy: "none" as const,
		};

		const result = JSON.parse(entriesToJson(entries, config, NOW));

		expect(result.entries).toHaveLength(1);
		expect(result.entries[0].name).toBe("Dev");
		expect(result.entries[0].entryCount).toBe(2);
	});
});

describe("generateFilename", () => {
	it("includes mode, date, and format extension", () => {
		const filename = generateFilename("detailed", "none", "csv");

		expect(filename).toMatch(/^time-entries-detailed-\d{4}-\d{2}-\d{2}\.csv$/);
	});

	it("includes groupBy suffix when not none", () => {
		const filename = generateFilename("summary", "client", "json");

		expect(filename).toMatch(/^time-entries-summary-by-client-\d{4}-\d{2}-\d{2}\.json$/);
	});

	it("omits groupBy suffix when groupBy is none", () => {
		const filename = generateFilename("detailed", "none", "json");

		expect(filename).not.toContain("-by-");
	});
});
