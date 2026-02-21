import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import {
	createTest,
	seedCategory,
	seedTimeEntry,
	seedUser,
} from "./setup.testing";

describe("categories", () => {
	test("creates a category", async () => {
		const t = createTest();
		const userId = await t.run(async (ctx) => seedUser(ctx));

		const categoryId = await t.mutation(api.categories.create, {
			name: "Development",
			userId,
		});

		const category = await t.run(async (ctx) => ctx.db.get(categoryId));
		expect(category).not.toBeNull();
		expect(category!.name).toBe("Development");
		expect(category!.userId).toBe(userId);
	});

	test("throws on delete for wrong userId", async () => {
		const t = createTest();
		const userId1 = await t.run(async (ctx) =>
			seedUser(ctx, { email: "u1@test.com" }),
		);
		const userId2 = await t.run(async (ctx) =>
			seedUser(ctx, { email: "u2@test.com" }),
		);

		const categoryId = await t.mutation(api.categories.create, {
			name: "Category",
			userId: userId1,
		});

		await expect(
			t.mutation(api.categories.deleteOne, {
				id: categoryId,
				userId: userId2,
			}),
		).rejects.toThrow("does not belong to user");
	});

	test("searchByName returns all categories when query is empty", async () => {
		const t = createTest();
		const userId = await t.run(async (ctx) => seedUser(ctx));
		await t.run(async (ctx) => {
			await seedCategory(ctx, userId, "Development");
			await seedCategory(ctx, userId, "Design");
		});

		const result = await t.query(api.categories.searchByName, {
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
			await seedCategory(ctx, userId, "Development");
			await seedCategory(ctx, userId, "Design");
		});

		const result = await t.query(api.categories.searchByName, {
			userId,
			query: "Development",
			paginationOpts: { numItems: 10, cursor: null },
		});

		expect(result.page).toHaveLength(1);
		expect(result.page[0].name).toBe("Development");
	});

	test("update changes category name", async () => {
		const t = createTest();
		const userId = await t.run(async (ctx) => seedUser(ctx));
		const categoryId = await t.mutation(api.categories.create, {
			name: "Old Name",
			userId,
		});

		await t.mutation(api.categories.update, {
			id: categoryId,
			userId,
			name: "New Name",
		});

		const category = await t.run(async (ctx) => ctx.db.get(categoryId));
		expect(category!.name).toBe("New Name");
	});

	test("cascade deletion nullifies categoryId on time_entries", async () => {
		const t = createTest();
		const userId = await t.run(async (ctx) => seedUser(ctx));
		const categoryId = await t.run(async (ctx) =>
			seedCategory(ctx, userId, "To Delete"),
		);
		const entryId = await t.run(async (ctx) =>
			seedTimeEntry(ctx, userId, { categoryId, name: "Linked Entry" }),
		);

		await t.mutation(api.categories.deleteOne, { id: categoryId, userId });

		// Category should be gone
		const category = await t.run(async (ctx) => ctx.db.get(categoryId));
		expect(category).toBeNull();

		// Time entry should have categoryId nullified
		const entry = await t.run(async (ctx) => ctx.db.get(entryId));
		expect(entry).not.toBeNull();
		expect(entry!.categoryId).toBeUndefined();
	});
});
