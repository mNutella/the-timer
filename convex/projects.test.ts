import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import {
	createTest,
	seedClient,
	seedProject,
	seedTimeEntry,
	seedUser,
} from "./setup.testing";

describe("projects", () => {
	test("creates a project", async () => {
		const t = createTest();
		const userId = await t.run(async (ctx) => seedUser(ctx));
		const clientId = await t.run(async (ctx) =>
			seedClient(ctx, userId, "Acme"),
		);

		const projectId = await t.mutation(api.projects.create, {
			name: "Website Redesign",
			userId,
			clientId,
		});

		const project = await t.run(async (ctx) => ctx.db.get(projectId));
		expect(project).not.toBeNull();
		expect(project!.name).toBe("Website Redesign");
		expect(project!.userId).toBe(userId);
		expect(project!.clientId).toBe(clientId);
		expect(project!.status).toBe("active");
	});

	test("throws on delete for wrong userId", async () => {
		const t = createTest();
		const userId1 = await t.run(async (ctx) =>
			seedUser(ctx, { email: "u1@test.com" }),
		);
		const userId2 = await t.run(async (ctx) =>
			seedUser(ctx, { email: "u2@test.com" }),
		);

		const projectId = await t.mutation(api.projects.create, {
			name: "Project",
			userId: userId1,
		});

		await expect(
			t.mutation(api.projects.deleteOne, {
				id: projectId,
				userId: userId2,
			}),
		).rejects.toThrow("does not belong to user");
	});

	test("searchByName returns all projects when query is empty", async () => {
		const t = createTest();
		const userId = await t.run(async (ctx) => seedUser(ctx));
		await t.run(async (ctx) => {
			await seedProject(ctx, userId, { name: "Website" });
			await seedProject(ctx, userId, { name: "Mobile App" });
		});

		const result = await t.query(api.projects.searchByName, {
			userId,
			query: "",
			paginationOpts: { numItems: 10, cursor: null },
		});

		expect(result.page).toHaveLength(2);
	});

	test("searchByName filters by name", async () => {
		const t = createTest();
		const userId = await t.run(async (ctx) => seedUser(ctx));
		await t.run(async (ctx) => {
			await seedProject(ctx, userId, { name: "Website Redesign" });
			await seedProject(ctx, userId, { name: "Mobile App" });
		});

		const result = await t.query(api.projects.searchByName, {
			userId,
			query: "Website",
			paginationOpts: { numItems: 10, cursor: null },
		});

		expect(result.page).toHaveLength(1);
		expect(result.page[0].name).toBe("Website Redesign");
	});

	test("searchByName filters by clientId", async () => {
		const t = createTest();
		const userId = await t.run(async (ctx) => seedUser(ctx));
		const clientId = await t.run(async (ctx) =>
			seedClient(ctx, userId, "Acme"),
		);
		await t.run(async (ctx) => {
			await seedProject(ctx, userId, { name: "Acme Web", clientId });
			await seedProject(ctx, userId, { name: "Internal Tool" });
		});

		const result = await t.query(api.projects.searchByName, {
			userId,
			query: "",
			clientId,
			paginationOpts: { numItems: 10, cursor: null },
		});

		expect(result.page).toHaveLength(1);
		expect(result.page[0].name).toBe("Acme Web");
	});

	test("update changes project name and status", async () => {
		const t = createTest();
		const userId = await t.run(async (ctx) => seedUser(ctx));
		const projectId = await t.mutation(api.projects.create, {
			name: "Old Name",
			userId,
		});

		await t.mutation(api.projects.update, {
			id: projectId,
			userId,
			name: "New Name",
			status: "archived",
		});

		const project = await t.run(async (ctx) => ctx.db.get(projectId));
		expect(project!.name).toBe("New Name");
		expect(project!.status).toBe("archived");
	});

	test("cascade deletion nullifies projectId on time_entries", async () => {
		const t = createTest();
		const userId = await t.run(async (ctx) => seedUser(ctx));
		const projectId = await t.run(async (ctx) =>
			seedProject(ctx, userId, { name: "To Delete" }),
		);
		const entryId = await t.run(async (ctx) =>
			seedTimeEntry(ctx, userId, { projectId, name: "Linked Entry" }),
		);

		await t.mutation(api.projects.deleteOne, { id: projectId, userId });

		// Project should be gone
		const project = await t.run(async (ctx) => ctx.db.get(projectId));
		expect(project).toBeNull();

		// Time entry should have projectId nullified
		const entry = await t.run(async (ctx) => ctx.db.get(entryId));
		expect(entry).not.toBeNull();
		expect(entry!.projectId).toBeUndefined();
	});
});
