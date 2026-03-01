import { describe, expect, test } from "vitest";

import { api } from "./_generated/api";
import {
	authenticateAs,
	createTest,
	seedClient,
	seedProject,
	seedTimeEntry,
} from "./setup.testing";

describe("projects", () => {
	test("creates a project", async () => {
		const t = createTest();
		const { userId, asUser } = await authenticateAs(t);
		const clientId = await t.run(async (ctx) => seedClient(ctx, userId, "Acme"));

		const projectId = await asUser.mutation(api.projects.create, {
			name: "Website Redesign",
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
		const { asUser: asUser1 } = await authenticateAs(t, {
			email: "u1@test.com",
		});
		const { asUser: asUser2 } = await authenticateAs(t, {
			email: "u2@test.com",
		});

		const projectId = await asUser1.mutation(api.projects.create, {
			name: "Project",
		});

		await expect(
			asUser2.mutation(api.projects.deleteOne, {
				id: projectId,
			}),
		).rejects.toThrow("does not belong to user");
	});

	test("searchByName returns all projects when query is empty", async () => {
		const t = createTest();
		const { userId, asUser } = await authenticateAs(t);
		await t.run(async (ctx) => {
			await seedProject(ctx, userId, { name: "Website" });
			await seedProject(ctx, userId, { name: "Mobile App" });
		});

		const result = await asUser.query(api.projects.searchByName, {
			query: "",
			paginationOpts: { numItems: 10, cursor: null },
		});

		expect(result.page).toHaveLength(2);
	});

	test("searchByName filters by name", async () => {
		const t = createTest();
		const { userId, asUser } = await authenticateAs(t);
		await t.run(async (ctx) => {
			await seedProject(ctx, userId, { name: "Website Redesign" });
			await seedProject(ctx, userId, { name: "Mobile App" });
		});

		const result = await asUser.query(api.projects.searchByName, {
			query: "Website",
			paginationOpts: { numItems: 10, cursor: null },
		});

		expect(result.page).toHaveLength(1);
		expect(result.page[0].name).toBe("Website Redesign");
	});

	test("searchByName filters by clientId", async () => {
		const t = createTest();
		const { userId, asUser } = await authenticateAs(t);
		const clientId = await t.run(async (ctx) => seedClient(ctx, userId, "Acme"));
		await t.run(async (ctx) => {
			await seedProject(ctx, userId, { name: "Acme Web", clientId });
			await seedProject(ctx, userId, { name: "Internal Tool" });
		});

		const result = await asUser.query(api.projects.searchByName, {
			query: "",
			clientId,
			paginationOpts: { numItems: 10, cursor: null },
		});

		expect(result.page).toHaveLength(1);
		expect(result.page[0].name).toBe("Acme Web");
	});

	test("update changes project name and status", async () => {
		const t = createTest();
		const { asUser } = await authenticateAs(t);
		const projectId = await asUser.mutation(api.projects.create, {
			name: "Old Name",
		});

		await asUser.mutation(api.projects.update, {
			id: projectId,
			name: "New Name",
			status: "archived",
		});

		const project = await t.run(async (ctx) => ctx.db.get(projectId));
		expect(project!.name).toBe("New Name");
		expect(project!.status).toBe("archived");
	});

	test("cascade deletion nullifies projectId on time_entries", async () => {
		const t = createTest();
		const { userId, asUser } = await authenticateAs(t);
		const projectId = await t.run(async (ctx) => seedProject(ctx, userId, { name: "To Delete" }));
		const entryId = await t.run(async (ctx) =>
			seedTimeEntry(ctx, userId, { projectId, name: "Linked Entry" }),
		);

		await asUser.mutation(api.projects.deleteOne, { id: projectId });

		// Project should be gone
		const project = await t.run(async (ctx) => ctx.db.get(projectId));
		expect(project).toBeNull();

		// Time entry should have projectId nullified
		const entry = await t.run(async (ctx) => ctx.db.get(entryId));
		expect(entry).not.toBeNull();
		expect(entry!.projectId).toBeUndefined();
	});
});
