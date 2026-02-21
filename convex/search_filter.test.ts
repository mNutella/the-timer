import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import {
	createTest,
	seedCategory,
	seedClient,
	seedProject,
	seedTimeEntry,
	seedUser,
} from "./setup.testing";

const DAY1 = new Date("2024-01-15T12:00:00Z").getTime();
const DAY2 = new Date("2024-01-16T12:00:00Z").getTime();
const DAY3 = new Date("2024-01-17T12:00:00Z").getTime();

describe("searchTimeEntries", () => {
	test("returns all entries for user when no filters are set", async () => {
		const t = createTest();
		const userId = await t.run(async (ctx) => seedUser(ctx));
		await t.run(async (ctx) => {
			await seedTimeEntry(ctx, userId, {
				name: "Entry 1",
				start_time: DAY1,
				end_time: DAY1 + 3_600_000,
				duration: 3_600_000,
			});
			await seedTimeEntry(ctx, userId, {
				name: "Entry 2",
				start_time: DAY2,
				end_time: DAY2 + 1_800_000,
				duration: 1_800_000,
			});
		});

		const result = await t.query(api.time_entries.searchTimeEntries, {
			userId,
			paginationOpts: { numItems: 10, cursor: null },
		});

		expect(result.page).toHaveLength(2);
	});

	test("does not return entries from other users", async () => {
		const t = createTest();
		const user1 = await t.run(async (ctx) => seedUser(ctx, { name: "User 1" }));
		const user2 = await t.run(async (ctx) => seedUser(ctx, { name: "User 2" }));
		await t.run(async (ctx) => {
			await seedTimeEntry(ctx, user1, {
				name: "User1 entry",
				start_time: DAY1,
				end_time: DAY1 + 3_600_000,
				duration: 3_600_000,
			});
			await seedTimeEntry(ctx, user2, {
				name: "User2 entry",
				start_time: DAY1,
				end_time: DAY1 + 3_600_000,
				duration: 3_600_000,
			});
		});

		const result = await t.query(api.time_entries.searchTimeEntries, {
			userId: user1,
			paginationOpts: { numItems: 10, cursor: null },
		});

		expect(result.page).toHaveLength(1);
		expect(result.page[0].name).toBe("User1 entry");
	});

	test("filters by single client", async () => {
		const t = createTest();
		const userId = await t.run(async (ctx) => seedUser(ctx));
		const clientId = await t.run(async (ctx) =>
			seedClient(ctx, userId, "Acme"),
		);
		await t.run(async (ctx) => {
			await seedTimeEntry(ctx, userId, {
				name: "Acme work",
				clientId,
				start_time: DAY1,
				end_time: DAY1 + 3_600_000,
				duration: 3_600_000,
			});
			await seedTimeEntry(ctx, userId, {
				name: "Other work",
				start_time: DAY2,
				end_time: DAY2 + 3_600_000,
				duration: 3_600_000,
			});
		});

		const result = await t.query(api.time_entries.searchTimeEntries, {
			userId,
			filters: { clientIds: [clientId] },
			paginationOpts: { numItems: 10, cursor: null },
		});

		expect(result.page).toHaveLength(1);
		expect(result.page[0].name).toBe("Acme work");
	});

	test("filters by multiple clients (OR logic)", async () => {
		const t = createTest();
		const userId = await t.run(async (ctx) => seedUser(ctx));
		const client1 = await t.run(async (ctx) =>
			seedClient(ctx, userId, "Alpha"),
		);
		const client2 = await t.run(async (ctx) => seedClient(ctx, userId, "Beta"));
		const client3 = await t.run(async (ctx) =>
			seedClient(ctx, userId, "Gamma"),
		);
		await t.run(async (ctx) => {
			await seedTimeEntry(ctx, userId, {
				name: "Alpha work",
				clientId: client1,
				start_time: DAY1,
				end_time: DAY1 + 3_600_000,
				duration: 3_600_000,
			});
			await seedTimeEntry(ctx, userId, {
				name: "Beta work",
				clientId: client2,
				start_time: DAY2,
				end_time: DAY2 + 3_600_000,
				duration: 3_600_000,
			});
			await seedTimeEntry(ctx, userId, {
				name: "Gamma work",
				clientId: client3,
				start_time: DAY3,
				end_time: DAY3 + 3_600_000,
				duration: 3_600_000,
			});
		});

		const result = await t.query(api.time_entries.searchTimeEntries, {
			userId,
			filters: { clientIds: [client1, client2] },
			paginationOpts: { numItems: 10, cursor: null },
		});

		expect(result.page).toHaveLength(2);
		const names = result.page.map((e: { name: string }) => e.name).sort();
		expect(names).toEqual(["Alpha work", "Beta work"]);
	});

	test("filters by single project", async () => {
		const t = createTest();
		const userId = await t.run(async (ctx) => seedUser(ctx));
		const projectId = await t.run(async (ctx) =>
			seedProject(ctx, userId, { name: "Website" }),
		);
		await t.run(async (ctx) => {
			await seedTimeEntry(ctx, userId, {
				name: "Web work",
				projectId,
				start_time: DAY1,
				end_time: DAY1 + 3_600_000,
				duration: 3_600_000,
			});
			await seedTimeEntry(ctx, userId, {
				name: "Other",
				start_time: DAY2,
				end_time: DAY2 + 3_600_000,
				duration: 3_600_000,
			});
		});

		const result = await t.query(api.time_entries.searchTimeEntries, {
			userId,
			filters: { projectIds: [projectId] },
			paginationOpts: { numItems: 10, cursor: null },
		});

		expect(result.page).toHaveLength(1);
		expect(result.page[0].name).toBe("Web work");
	});

	test("filters by single category", async () => {
		const t = createTest();
		const userId = await t.run(async (ctx) => seedUser(ctx));
		const categoryId = await t.run(async (ctx) =>
			seedCategory(ctx, userId, "Development"),
		);
		await t.run(async (ctx) => {
			await seedTimeEntry(ctx, userId, {
				name: "Dev task",
				categoryId,
				start_time: DAY1,
				end_time: DAY1 + 3_600_000,
				duration: 3_600_000,
			});
			await seedTimeEntry(ctx, userId, {
				name: "Other",
				start_time: DAY2,
				end_time: DAY2 + 3_600_000,
				duration: 3_600_000,
			});
		});

		const result = await t.query(api.time_entries.searchTimeEntries, {
			userId,
			filters: { categoryIds: [categoryId] },
			paginationOpts: { numItems: 10, cursor: null },
		});

		expect(result.page).toHaveLength(1);
		expect(result.page[0].name).toBe("Dev task");
	});

	test("filters by date range", async () => {
		const t = createTest();
		const userId = await t.run(async (ctx) => seedUser(ctx));
		await t.run(async (ctx) => {
			await seedTimeEntry(ctx, userId, {
				name: "Day 1",
				start_time: DAY1,
				end_time: DAY1 + 3_600_000,
				duration: 3_600_000,
			});
			await seedTimeEntry(ctx, userId, {
				name: "Day 2",
				start_time: DAY2,
				end_time: DAY2 + 3_600_000,
				duration: 3_600_000,
			});
			await seedTimeEntry(ctx, userId, {
				name: "Day 3",
				start_time: DAY3,
				end_time: DAY3 + 3_600_000,
				duration: 3_600_000,
			});
		});

		const result = await t.query(api.time_entries.searchTimeEntries, {
			userId,
			filters: {
				dateRange: {
					startDate: DAY1,
					endDate: DAY2 + 86_400_000, // end of day 2
				},
			},
			paginationOpts: { numItems: 10, cursor: null },
		});

		// Day 1 and Day 2 should be included
		expect(result.page.length).toBeGreaterThanOrEqual(2);
		const names = result.page.map((e: { name: string }) => e.name);
		expect(names).toContain("Day 1");
		expect(names).toContain("Day 2");
	});

	test("resolves client edge when include.client is true (default)", async () => {
		const t = createTest();
		const userId = await t.run(async (ctx) => seedUser(ctx));
		const clientId = await t.run(async (ctx) =>
			seedClient(ctx, userId, "Acme"),
		);
		await t.run(async (ctx) => {
			await seedTimeEntry(ctx, userId, {
				name: "Work",
				clientId,
				start_time: DAY1,
				end_time: DAY1 + 3_600_000,
				duration: 3_600_000,
			});
		});

		const result = await t.query(api.time_entries.searchTimeEntries, {
			userId,
			paginationOpts: { numItems: 10, cursor: null },
		});

		expect(result.page[0].client).not.toBeNull();
		expect(result.page[0].client!.name).toBe("Acme");
	});

	test("resolves project edge when include.project is true (default)", async () => {
		const t = createTest();
		const userId = await t.run(async (ctx) => seedUser(ctx));
		const projectId = await t.run(async (ctx) =>
			seedProject(ctx, userId, { name: "Website" }),
		);
		await t.run(async (ctx) => {
			await seedTimeEntry(ctx, userId, {
				name: "Work",
				projectId,
				start_time: DAY1,
				end_time: DAY1 + 3_600_000,
				duration: 3_600_000,
			});
		});

		const result = await t.query(api.time_entries.searchTimeEntries, {
			userId,
			paginationOpts: { numItems: 10, cursor: null },
		});

		expect(result.page[0].project).not.toBeNull();
		expect(result.page[0].project!.name).toBe("Website");
	});

	test("returns null for unset client/project edges", async () => {
		const t = createTest();
		const userId = await t.run(async (ctx) => seedUser(ctx));
		await t.run(async (ctx) => {
			await seedTimeEntry(ctx, userId, {
				name: "Bare entry",
				start_time: DAY1,
				end_time: DAY1 + 3_600_000,
				duration: 3_600_000,
			});
		});

		const result = await t.query(api.time_entries.searchTimeEntries, {
			userId,
			paginationOpts: { numItems: 10, cursor: null },
		});

		expect(result.page[0].client).toBeNull();
		expect(result.page[0].project).toBeNull();
	});
});

describe("exportTimeEntries", () => {
	test("returns all matching entries (non-paginated) with resolved edges", async () => {
		const t = createTest();
		const userId = await t.run(async (ctx) => seedUser(ctx));
		const clientId = await t.run(async (ctx) =>
			seedClient(ctx, userId, "Export Client"),
		);
		await t.run(async (ctx) => {
			await seedTimeEntry(ctx, userId, {
				name: "Entry A",
				clientId,
				start_time: DAY1,
				end_time: DAY1 + 3_600_000,
				duration: 3_600_000,
			});
			await seedTimeEntry(ctx, userId, {
				name: "Entry B",
				start_time: DAY2,
				end_time: DAY2 + 1_800_000,
				duration: 1_800_000,
			});
		});

		const result = await t.query(api.time_entries.exportTimeEntries, {
			userId,
		});

		expect(result).toHaveLength(2);
		const withClient = result.find(
			(e: { name: string }) => e.name === "Entry A",
		);
		expect(withClient!.client).not.toBeNull();
		expect(withClient!.client!.name).toBe("Export Client");
	});

	test("respects client filter", async () => {
		const t = createTest();
		const userId = await t.run(async (ctx) => seedUser(ctx));
		const clientId = await t.run(async (ctx) =>
			seedClient(ctx, userId, "Filter Client"),
		);
		await t.run(async (ctx) => {
			await seedTimeEntry(ctx, userId, {
				name: "Match",
				clientId,
				start_time: DAY1,
				end_time: DAY1 + 3_600_000,
				duration: 3_600_000,
			});
			await seedTimeEntry(ctx, userId, {
				name: "No match",
				start_time: DAY2,
				end_time: DAY2 + 3_600_000,
				duration: 3_600_000,
			});
		});

		const result = await t.query(api.time_entries.exportTimeEntries, {
			userId,
			filters: { clientIds: [clientId] },
		});

		expect(result).toHaveLength(1);
		expect(result[0].name).toBe("Match");
	});
});

describe("getRunningTimer", () => {
	test("returns null when no timer is running", async () => {
		const t = createTest();
		const userId = await t.run(async (ctx) => seedUser(ctx));
		await t.run(async (ctx) => {
			await seedTimeEntry(ctx, userId, {
				name: "Stopped",
				start_time: DAY1,
				end_time: DAY1 + 3_600_000,
				duration: 3_600_000,
			});
		});

		const result = await t.query(api.time_entries.getRunningTimer, { userId });

		expect(result).toBeNull();
	});

	test("returns the running timer with resolved edges", async () => {
		const t = createTest();
		const userId = await t.run(async (ctx) => seedUser(ctx));
		const clientId = await t.run(async (ctx) =>
			seedClient(ctx, userId, "Active Client"),
		);
		await t.run(async (ctx) => {
			await seedTimeEntry(ctx, userId, {
				name: "Running",
				start_time: DAY1,
				clientId,
			});
		});

		const result = await t.query(api.time_entries.getRunningTimer, { userId });

		expect(result).not.toBeNull();
		expect(result!.name).toBe("Running");
		expect(result!.client).not.toBeNull();
		expect(result!.client!.name).toBe("Active Client");
	});
});
