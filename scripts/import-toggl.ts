import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

interface ParsedEntry {
	description: string;
	billable: boolean;
	duration_ms: number;
	project: string;
	tag?: string;
	start_time: number;
	end_time: number;
}

function parseDuration(duration: string): number {
	const [h, m, s] = duration.split(":").map(Number);
	return (h * 3600 + m * 60 + s) * 1000;
}

function parseDateTime(date: string, time: string): number {
	// date: "YYYY-MM-DD", time: "HH:MM:SS"
	return new Date(`${date}T${time}`).getTime();
}

function parseCSV(content: string): string[][] {
	const rows: string[][] = [];
	const lines = content.trim().split("\n");

	for (const line of lines) {
		const fields: string[] = [];
		let current = "";
		let inQuotes = false;

		for (let i = 0; i < line.length; i++) {
			const char = line[i];
			if (inQuotes) {
				if (char === '"') {
					if (i + 1 < line.length && line[i + 1] === '"') {
						current += '"';
						i++;
					} else {
						inQuotes = false;
					}
				} else {
					current += char;
				}
			} else if (char === '"') {
				inQuotes = true;
			} else if (char === ",") {
				fields.push(current);
				current = "";
			} else {
				current += char;
			}
		}
		fields.push(current);
		rows.push(fields);
	}

	return rows;
}

function main() {
	const csvPath = process.argv[2];
	const email = process.argv[3];

	if (!csvPath || !email) {
		console.error("Usage: npx tsx scripts/import-toggl.ts <csv-path> <email>");
		process.exit(1);
	}

	const content = readFileSync(csvPath, "utf-8");
	const rows = parseCSV(content);
	const header = rows[0];
	const dataRows = rows.slice(1);

	// Map column names to indices
	const col = (name: string) => {
		const idx = header.indexOf(name);
		if (idx === -1) throw new Error(`Column "${name}" not found in CSV`);
		return idx;
	};

	const entries: ParsedEntry[] = dataRows.map((row) => {
		const tag = row[col("Tags")];
		return {
			description: row[col("Description")],
			billable: row[col("Billable")] === "Yes",
			duration_ms: parseDuration(row[col("Duration")]),
			project: row[col("Project")],
			tag: tag === "-" ? undefined : tag,
			start_time: parseDateTime(row[col("Start date")], row[col("Start time")]),
			end_time: parseDateTime(row[col("Stop date")], row[col("Stop time")]),
		};
	});

	// Print summary
	const clients = new Set(entries.map((e) => e.project));
	const projects = new Set(entries.filter((e) => e.tag).map((e) => `${e.project}::${e.tag}`));

	console.log(`\nToggl Import Summary:`);
	console.log(`  Clients: ${clients.size} (${[...clients].join(", ")})`);
	console.log(`  Projects: ${projects.size}`);
	console.log(`  Time Entries: ${entries.length}`);
	console.log();

	// Invoke convex mutation using execFileSync (no shell injection)
	const args = JSON.stringify({ email, entries });
	console.log("Running convex mutation...");

	try {
		const result = execFileSync("npx", ["convex", "run", "import_toggl:importTogglData", args], {
			cwd: process.cwd(),
			encoding: "utf-8",
		});
		console.log("Result:", result.trim());
		console.log("\nImport complete!");
	} catch (err: unknown) {
		const error = err as { stderr?: string; message?: string };
		console.error("Import failed:", error.stderr || error.message);
		process.exit(1);
	}
}

main();
