import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import {
	authenticateAs,
	createTest,
	seedClient,
	seedProject,
	seedTimeEntry,
} from "./setup.testing";

describe("clients", () => {
	test("creates a client", async () => {
		const t = createTest();
		const { userId, asUser } = await authenticateAs(t);

		const clientId = await asUser.mutation(api.clients.create, {
			name: "Acme Corp",
		});

		const client = await t.run(async (ctx) => ctx.db.get(clientId));
		expect(client).not.toBeNull();
		expect(client!.name).toBe("Acme Corp");
		expect(client!.userId).toBe(userId);
	});

	test("updates a client name", async () => {
		const t = createTest();
		const { asUser } = await authenticateAs(t);

		const clientId = await asUser.mutation(api.clients.create, {
			name: "Old Name",
		});

		await asUser.mutation(api.clients.update, {
			id: clientId,
			name: "New Name",
		});

		const client = await t.run(async (ctx) => ctx.db.get(clientId));
		expect(client!.name).toBe("New Name");
	});

	test("throws on update for wrong userId", async () => {
		const t = createTest();
		const { asUser: asUser1 } = await authenticateAs(t, {
			email: "u1@test.com",
		});
		const { asUser: asUser2 } = await authenticateAs(t, {
			email: "u2@test.com",
		});

		const clientId = await asUser1.mutation(api.clients.create, {
			name: "Client",
		});

		await expect(
			asUser2.mutation(api.clients.update, {
				id: clientId,
				name: "Hacked",
			}),
		).rejects.toThrow("does not belong to user");
	});

	test("searchByName returns all clients when query is empty", async () => {
		const t = createTest();
		const { userId, asUser } = await authenticateAs(t);
		await t.run(async (ctx) => {
			await seedClient(ctx, userId, "Alpha");
			await seedClient(ctx, userId, "Beta");
		});

		const result = await asUser.query(api.clients.searchByName, {
			query: "",
			paginationOpts: { numItems: 10, cursor: null },
		});

		expect(result.page).toHaveLength(2);
	});

	test("searchByName filters by name", async () => {
		const t = createTest();
		const { userId, asUser } = await authenticateAs(t);
		await t.run(async (ctx) => {
			await seedClient(ctx, userId, "Acme Corp");
			await seedClient(ctx, userId, "Beta Inc");
		});

		const result = await asUser.query(api.clients.searchByName, {
			query: "Acme",
			paginationOpts: { numItems: 10, cursor: null },
		});

		expect(result.page).toHaveLength(1);
		expect(result.page[0].name).toBe("Acme Corp");
	});

	test("searchByName does not return clients from other users", async () => {
		const t = createTest();
		const { userId: user1, asUser: asUser1 } = await authenticateAs(t, {
			email: "u1@test.com",
		});
		const { userId: user2 } = await authenticateAs(t, {
			email: "u2@test.com",
		});
		await t.run(async (ctx) => {
			await seedClient(ctx, user1, "User1 Client");
			await seedClient(ctx, user2, "User2 Client");
		});

		const result = await asUser1.query(api.clients.searchByName, {
			query: "",
			paginationOpts: { numItems: 10, cursor: null },
		});

		expect(result.page).toHaveLength(1);
		expect(result.page[0].name).toBe("User1 Client");
	});

	test("cascade deletion nullifies clientId on time_entries and projects", async () => {
		const t = createTest();
		const { userId, asUser } = await authenticateAs(t);
		const clientId = await t.run(async (ctx) =>
			seedClient(ctx, userId, "To Delete"),
		);
		const projectId = await t.run(async (ctx) =>
			seedProject(ctx, userId, { clientId, name: "Linked Project" }),
		);
		const entryId = await t.run(async (ctx) =>
			seedTimeEntry(ctx, userId, { clientId, name: "Linked Entry" }),
		);

		await asUser.mutation(api.clients.deleteOne, { id: clientId });

		// Client should be gone
		const client = await t.run(async (ctx) => ctx.db.get(clientId));
		expect(client).toBeNull();

		// Time entry should have clientId nullified
		const entry = await t.run(async (ctx) => ctx.db.get(entryId));
		expect(entry).not.toBeNull();
		expect(entry!.clientId).toBeUndefined();

		// Project should have clientId nullified
		const project = await t.run(async (ctx) => ctx.db.get(projectId));
		expect(project).not.toBeNull();
		expect(project!.clientId).toBeUndefined();
	});
});
