import { expect, test, describe } from "vitest";
import { api } from "./_generated/api";
import {
	authenticateAs,
	createTest,
	seedClient,
	seedProject,
	seedCategory,
	seedTimeEntry,
} from "./setup.testing";

describe("time_entries", () => {
	describe("create", () => {
		test("creates a running timer with start_time and no end_time", async () => {
			const t = createTest();
			const { asUser } = await authenticateAs(t);

			const entryId = await asUser.mutation(api.time_entries.create, {
				name: "Working on feature",
			});

			const entry = await t.run(async (ctx) => ctx.db.get(entryId));
			expect(entry).not.toBeNull();
			expect(entry!.name).toBe("Working on feature");
			expect(entry!.start_time).toBeTypeOf("number");
			expect(entry!.end_time).toBeUndefined();
		});

		test("auto-stops previous running timer", async () => {
			const t = createTest();
			const { asUser } = await authenticateAs(t);

			const firstId = await asUser.mutation(api.time_entries.create, {
				name: "First timer",
			});

			const secondId = await asUser.mutation(api.time_entries.create, {
				name: "Second timer",
			});

			const first = await t.run(async (ctx) => ctx.db.get(firstId));
			const second = await t.run(async (ctx) => ctx.db.get(secondId));

			expect(first!.end_time).toBeTypeOf("number");
			expect(first!.duration).toBeTypeOf("number");
			expect(first!.duration).toBeGreaterThanOrEqual(0);

			expect(second!.end_time).toBeUndefined();
		});

		test("copies metadata from existing entry (resume)", async () => {
			const t = createTest();
			const { userId, asUser } = await authenticateAs(t);
			const clientId = await t.run(async (ctx) =>
				seedClient(ctx, userId, "Acme"),
			);
			const projectId = await t.run(async (ctx) =>
				seedProject(ctx, userId, { clientId }),
			);

			const originalId = await asUser.mutation(api.time_entries.create, {
				name: "Original task",
				clientId,
				projectId,
			});

			// Stop the first timer
			await asUser.mutation(api.time_entries.stop, { id: originalId });

			// Resume from the original
			const resumedId = await asUser.mutation(api.time_entries.create, {
				name: "ignored — should copy original",
				timeEntryId: originalId,
			});

			const resumed = await t.run(async (ctx) => ctx.db.get(resumedId));
			expect(resumed!.name).toBe("Original task");
			expect(resumed!.clientId).toBe(clientId);
			expect(resumed!.projectId).toBe(projectId);
		});

		test("throws for mismatched userId on resume", async () => {
			const t = createTest();
			const { asUser: asUser1 } = await authenticateAs(t, {
				email: "user1@test.com",
			});
			const { asUser: asUser2 } = await authenticateAs(t, {
				email: "user2@test.com",
			});

			const entryId = await asUser1.mutation(api.time_entries.create, {
				name: "User 1 timer",
			});

			await expect(
				asUser2.mutation(api.time_entries.create, {
					name: "Try to resume",
					timeEntryId: entryId,
				}),
			).rejects.toThrow("does not belong to user");
		});
	});

	describe("stop", () => {
		test("sets end_time and duration", async () => {
			const t = createTest();
			const { asUser } = await authenticateAs(t);

			const entryId = await asUser.mutation(api.time_entries.create, {
				name: "Timer to stop",
			});

			await asUser.mutation(api.time_entries.stop, { id: entryId });

			const entry = await t.run(async (ctx) => ctx.db.get(entryId));
			expect(entry!.end_time).toBeTypeOf("number");
			expect(entry!.duration).toBeTypeOf("number");
			expect(entry!.end_time).toBeGreaterThanOrEqual(entry!.start_time!);
			expect(entry!.duration).toBe(entry!.end_time! - entry!.start_time!);
		});

		test("idempotent on already-stopped timer", async () => {
			const t = createTest();
			const { asUser } = await authenticateAs(t);

			const entryId = await asUser.mutation(api.time_entries.create, {
				name: "Timer",
			});

			await asUser.mutation(api.time_entries.stop, { id: entryId });
			const afterFirstStop = await t.run(async (ctx) => ctx.db.get(entryId));

			// Stop again — should not change anything
			await asUser.mutation(api.time_entries.stop, { id: entryId });
			const afterSecondStop = await t.run(async (ctx) => ctx.db.get(entryId));

			expect(afterSecondStop!.end_time).toBe(afterFirstStop!.end_time);
		});

		test("throws for wrong userId", async () => {
			const t = createTest();
			const { asUser: asUser1 } = await authenticateAs(t, {
				email: "u1@test.com",
			});
			const { asUser: asUser2 } = await authenticateAs(t, {
				email: "u2@test.com",
			});

			const entryId = await asUser1.mutation(api.time_entries.create, {
				name: "Timer",
			});

			await expect(
				asUser2.mutation(api.time_entries.stop, { id: entryId }),
			).rejects.toThrow("does not belong to user");
		});
	});

	describe("update", () => {
		test("updates name, description, notes", async () => {
			const t = createTest();
			const { asUser } = await authenticateAs(t);

			const entryId = await asUser.mutation(api.time_entries.create, {
				name: "Original",
			});

			await asUser.mutation(api.time_entries.update, {
				id: entryId,
				name: "Updated",
				description: "A description",
				notes: "Some notes",
			});

			const entry = await t.run(async (ctx) => ctx.db.get(entryId));
			expect(entry!.name).toBe("Updated");
			expect(entry!.description).toBe("A description");
			expect(entry!.notes).toBe("Some notes");
		});

		test("recomputes timing via computeNextTiming (duration change)", async () => {
			const t = createTest();
			const { asUser } = await authenticateAs(t);

			const entryId = await asUser.mutation(api.time_entries.create, {
				name: "Timer",
			});

			// Stop first to have start/end
			await asUser.mutation(api.time_entries.stop, { id: entryId });

			const newDuration = 3600000; // 1 hour

			await asUser.mutation(api.time_entries.update, {
				id: entryId,
				duration: newDuration,
			});

			const after = await t.run(async (ctx) => ctx.db.get(entryId));
			expect(after!.duration).toBe(newDuration);
			// end_time should have been recomputed: start_time + newDuration
			expect(after!.end_time).toBe(after!.start_time! + newDuration);
		});

		test("recomputes timing (startDate change)", async () => {
			const t = createTest();
			const { asUser } = await authenticateAs(t);

			const entryId = await asUser.mutation(api.time_entries.create, {
				name: "Timer",
			});

			await asUser.mutation(api.time_entries.stop, { id: entryId });

			const newStart = 1700000000000;

			await asUser.mutation(api.time_entries.update, {
				id: entryId,
				startDate: newStart,
			});

			const after = await t.run(async (ctx) => ctx.db.get(entryId));
			expect(after!.start_time).toBe(newStart);
			// duration should be recomputed from new start to existing end
			expect(after!.duration).toBe(after!.end_time! - newStart);
		});

		test("throws for wrong userId", async () => {
			const t = createTest();
			const { asUser: asUser1 } = await authenticateAs(t, {
				email: "u1@test.com",
			});
			const { asUser: asUser2 } = await authenticateAs(t, {
				email: "u2@test.com",
			});

			const entryId = await asUser1.mutation(api.time_entries.create, {
				name: "Timer",
			});

			await expect(
				asUser2.mutation(api.time_entries.update, {
					id: entryId,
					name: "Hacked",
				}),
			).rejects.toThrow("does not belong to user");
		});
	});

	describe("deleteOne", () => {
		test("deletes entry", async () => {
			const t = createTest();
			const { asUser } = await authenticateAs(t);

			const entryId = await asUser.mutation(api.time_entries.create, {
				name: "To delete",
			});

			await asUser.mutation(api.time_entries.deleteOne, { id: entryId });

			const entry = await t.run(async (ctx) => ctx.db.get(entryId));
			expect(entry).toBeNull();
		});

		test("throws for wrong userId", async () => {
			const t = createTest();
			const { asUser: asUser1 } = await authenticateAs(t, {
				email: "u1@test.com",
			});
			const { asUser: asUser2 } = await authenticateAs(t, {
				email: "u2@test.com",
			});

			const entryId = await asUser1.mutation(api.time_entries.create, {
				name: "Timer",
			});

			await expect(
				asUser2.mutation(api.time_entries.deleteOne, {
					id: entryId,
				}),
			).rejects.toThrow("does not belong to user");
		});
	});

	describe("updateClient", () => {
		test("sets clientId", async () => {
			const t = createTest();
			const { userId, asUser } = await authenticateAs(t);
			const clientId = await t.run(async (ctx) =>
				seedClient(ctx, userId, "Acme"),
			);

			const entryId = await asUser.mutation(api.time_entries.create, {
				name: "Timer",
			});

			await asUser.mutation(api.time_entries.updateClient, {
				timeEntryId: entryId,
				clientId,
			});

			const entry = await t.run(async (ctx) => ctx.db.get(entryId));
			expect(entry!.clientId).toBe(clientId);
		});

		test("clears projectId when project belongs to old client", async () => {
			const t = createTest();
			const { userId, asUser } = await authenticateAs(t);
			const clientA = await t.run(async (ctx) =>
				seedClient(ctx, userId, "Client A"),
			);
			const clientB = await t.run(async (ctx) =>
				seedClient(ctx, userId, "Client B"),
			);
			const projectA = await t.run(async (ctx) =>
				seedProject(ctx, userId, { clientId: clientA, name: "Project A" }),
			);

			const entryId = await asUser.mutation(api.time_entries.create, {
				name: "Timer",
				clientId: clientA,
				projectId: projectA,
			});

			// Switch to clientB — project belongs to clientA, so it should be cleared
			await asUser.mutation(api.time_entries.updateClient, {
				timeEntryId: entryId,
				clientId: clientB,
			});

			const entry = await t.run(async (ctx) => ctx.db.get(entryId));
			expect(entry!.clientId).toBe(clientB);
			expect(entry!.projectId).toBeUndefined();
		});

		test("preserves projectId when project belongs to new client", async () => {
			const t = createTest();
			const { userId, asUser } = await authenticateAs(t);
			const clientA = await t.run(async (ctx) =>
				seedClient(ctx, userId, "Client A"),
			);
			const projectA = await t.run(async (ctx) =>
				seedProject(ctx, userId, { clientId: clientA, name: "Project A" }),
			);

			const entryId = await asUser.mutation(api.time_entries.create, {
				name: "Timer",
				clientId: clientA,
				projectId: projectA,
			});

			// "Switch" to same client — project should be preserved
			await asUser.mutation(api.time_entries.updateClient, {
				timeEntryId: entryId,
				clientId: clientA,
			});

			const entry = await t.run(async (ctx) => ctx.db.get(entryId));
			expect(entry!.clientId).toBe(clientA);
			expect(entry!.projectId).toBe(projectA);
		});

		test("creates new client with newClientName", async () => {
			const t = createTest();
			const { asUser } = await authenticateAs(t);

			const entryId = await asUser.mutation(api.time_entries.create, {
				name: "Timer",
			});

			await asUser.mutation(api.time_entries.updateClient, {
				timeEntryId: entryId,
				newClientName: "Brand New Client",
			});

			const entry = await t.run(async (ctx) => ctx.db.get(entryId));
			expect(entry!.clientId).toBeDefined();

			const client = await t.run(async (ctx) =>
				ctx.db.get(entry!.clientId!),
			);
			expect(client!.name).toBe("Brand New Client");
		});

		test("deduplicates client name case-insensitively", async () => {
			const t = createTest();
			const { userId, asUser } = await authenticateAs(t);
			const existingClientId = await t.run(async (ctx) =>
				seedClient(ctx, userId, "Acme Corp"),
			);

			const entryId = await asUser.mutation(api.time_entries.create, {
				name: "Timer",
			});

			await asUser.mutation(api.time_entries.updateClient, {
				timeEntryId: entryId,
				newClientName: "acme corp",
			});

			const entry = await t.run(async (ctx) => ctx.db.get(entryId));
			expect(entry!.clientId).toBe(existingClientId);
		});

		test("throws if both clientId and newClientName", async () => {
			const t = createTest();
			const { userId, asUser } = await authenticateAs(t);
			const clientId = await t.run(async (ctx) =>
				seedClient(ctx, userId, "Acme"),
			);

			const entryId = await asUser.mutation(api.time_entries.create, {
				name: "Timer",
			});

			await expect(
				asUser.mutation(api.time_entries.updateClient, {
					timeEntryId: entryId,
					clientId,
					newClientName: "New Name",
				}),
			).rejects.toThrow("Provide exactly one");
		});
	});

	describe("updateProject", () => {
		test("sets projectId", async () => {
			const t = createTest();
			const { userId, asUser } = await authenticateAs(t);
			const projectId = await t.run(async (ctx) =>
				seedProject(ctx, userId),
			);

			const entryId = await asUser.mutation(api.time_entries.create, {
				name: "Timer",
			});

			await asUser.mutation(api.time_entries.updateProject, {
				timeEntryId: entryId,
				projectId,
			});

			const entry = await t.run(async (ctx) => ctx.db.get(entryId));
			expect(entry!.projectId).toBe(projectId);
		});

		test("creates new project with newProjectName (inherits clientId)", async () => {
			const t = createTest();
			const { userId, asUser } = await authenticateAs(t);
			const clientId = await t.run(async (ctx) =>
				seedClient(ctx, userId, "Acme"),
			);

			const entryId = await asUser.mutation(api.time_entries.create, {
				name: "Timer",
				clientId,
			});

			await asUser.mutation(api.time_entries.updateProject, {
				timeEntryId: entryId,
				newProjectName: "New Project",
			});

			const entry = await t.run(async (ctx) => ctx.db.get(entryId));
			expect(entry!.projectId).toBeDefined();

			const project = await t.run(async (ctx) =>
				ctx.db.get(entry!.projectId!),
			);
			expect(project!.name).toBe("New Project");
			expect(project!.clientId).toBe(clientId);
		});
	});

	describe("updateCategory", () => {
		test("sets categoryId", async () => {
			const t = createTest();
			const { userId, asUser } = await authenticateAs(t);
			const categoryId = await t.run(async (ctx) =>
				seedCategory(ctx, userId, "Development"),
			);

			const entryId = await asUser.mutation(api.time_entries.create, {
				name: "Timer",
			});

			await asUser.mutation(api.time_entries.updateCategory, {
				timeEntryId: entryId,
				categoryId,
			});

			const entry = await t.run(async (ctx) => ctx.db.get(entryId));
			expect(entry!.categoryId).toBe(categoryId);
		});

		test("creates new category with newCategoryName", async () => {
			const t = createTest();
			const { asUser } = await authenticateAs(t);

			const entryId = await asUser.mutation(api.time_entries.create, {
				name: "Timer",
			});

			await asUser.mutation(api.time_entries.updateCategory, {
				timeEntryId: entryId,
				newCategoryName: "Design",
			});

			const entry = await t.run(async (ctx) => ctx.db.get(entryId));
			expect(entry!.categoryId).toBeDefined();

			const category = await t.run(async (ctx) =>
				ctx.db.get(entry!.categoryId!),
			);
			expect(category!.name).toBe("Design");
		});
	});

	describe("bulkDelete", () => {
		test("deletes multiple entries", async () => {
			const t = createTest();
			const { userId, asUser } = await authenticateAs(t);

			const id1 = await t.run(async (ctx) =>
				seedTimeEntry(ctx, userId, { name: "Entry 1" }),
			);
			const id2 = await t.run(async (ctx) =>
				seedTimeEntry(ctx, userId, { name: "Entry 2" }),
			);
			const id3 = await t.run(async (ctx) =>
				seedTimeEntry(ctx, userId, { name: "Entry 3" }),
			);

			await asUser.mutation(api.time_entries.bulkDelete, {
				ids: [id1, id2],
			});

			const e1 = await t.run(async (ctx) => ctx.db.get(id1));
			const e2 = await t.run(async (ctx) => ctx.db.get(id2));
			const e3 = await t.run(async (ctx) => ctx.db.get(id3));

			expect(e1).toBeNull();
			expect(e2).toBeNull();
			expect(e3).not.toBeNull();
		});

		test("throws if any entry has wrong userId", async () => {
			const t = createTest();
			const { userId: userId1, asUser: asUser1 } = await authenticateAs(t, {
				email: "u1@test.com",
			});
			const { userId: userId2 } = await authenticateAs(t, {
				email: "u2@test.com",
			});

			const id1 = await t.run(async (ctx) =>
				seedTimeEntry(ctx, userId1, { name: "User1 entry" }),
			);
			const id2 = await t.run(async (ctx) =>
				seedTimeEntry(ctx, userId2, { name: "User2 entry" }),
			);

			await expect(
				asUser1.mutation(api.time_entries.bulkDelete, {
					ids: [id1, id2],
				}),
			).rejects.toThrow("does not belong to user");
		});
	});

	describe("bulkUpdate", () => {
		test("updates fields on multiple entries", async () => {
			const t = createTest();
			const { userId, asUser } = await authenticateAs(t);
			const clientId = await t.run(async (ctx) =>
				seedClient(ctx, userId, "Acme"),
			);

			const id1 = await t.run(async (ctx) =>
				seedTimeEntry(ctx, userId, { name: "Entry 1" }),
			);
			const id2 = await t.run(async (ctx) =>
				seedTimeEntry(ctx, userId, { name: "Entry 2" }),
			);

			await asUser.mutation(api.time_entries.bulkUpdate, {
				ids: [id1, id2],
				clientId,
			});

			const e1 = await t.run(async (ctx) => ctx.db.get(id1));
			const e2 = await t.run(async (ctx) => ctx.db.get(id2));

			expect(e1!.clientId).toBe(clientId);
			expect(e2!.clientId).toBe(clientId);
		});
	});

	describe("getRecentProjects", () => {
		test("returns empty when no entries have projects", async () => {
			const t = createTest();
			const { asUser } = await authenticateAs(t);

			// Create entry without project
			await asUser.mutation(api.time_entries.create, {
				name: "No project entry",
			});

			const result = await asUser.query(api.time_entries.getRecentProjects, {});
			expect(result).toHaveLength(0);
		});

		test("deduplicates projects from recent entries", async () => {
			const t = createTest();
			const { userId, asUser } = await authenticateAs(t);
			const clientId = await t.run(async (ctx) =>
				seedClient(ctx, userId, "Acme"),
			);
			const projectId = await t.run(async (ctx) =>
				seedProject(ctx, userId, { clientId, name: "Alpha" }),
			);

			// Two entries with the same project
			await t.run(async (ctx) =>
				seedTimeEntry(ctx, userId, {
					name: "Task 1",
					projectId,
					clientId,
				}),
			);
			await t.run(async (ctx) =>
				seedTimeEntry(ctx, userId, {
					name: "Task 2",
					projectId,
					clientId,
				}),
			);

			const result = await asUser.query(api.time_entries.getRecentProjects, {});
			expect(result).toHaveLength(1);
			expect(result[0].projectName).toBe("Alpha");
		});

		test("respects limit parameter", async () => {
			const t = createTest();
			const { userId, asUser } = await authenticateAs(t);
			const clientId = await t.run(async (ctx) =>
				seedClient(ctx, userId, "Acme"),
			);

			const p1 = await t.run(async (ctx) =>
				seedProject(ctx, userId, { clientId, name: "Project 1" }),
			);
			const p2 = await t.run(async (ctx) =>
				seedProject(ctx, userId, { clientId, name: "Project 2" }),
			);
			const p3 = await t.run(async (ctx) =>
				seedProject(ctx, userId, { clientId, name: "Project 3" }),
			);

			await t.run(async (ctx) =>
				seedTimeEntry(ctx, userId, { projectId: p1, clientId }),
			);
			await t.run(async (ctx) =>
				seedTimeEntry(ctx, userId, { projectId: p2, clientId }),
			);
			await t.run(async (ctx) =>
				seedTimeEntry(ctx, userId, { projectId: p3, clientId }),
			);

			const result = await asUser.query(api.time_entries.getRecentProjects, {
				limit: 2,
			});
			expect(result).toHaveLength(2);
		});

		test("includes client info for project", async () => {
			const t = createTest();
			const { userId, asUser } = await authenticateAs(t);
			const clientId = await t.run(async (ctx) =>
				seedClient(ctx, userId, "Acme Corp"),
			);
			const projectId = await t.run(async (ctx) =>
				seedProject(ctx, userId, { clientId, name: "Main Project" }),
			);

			await t.run(async (ctx) =>
				seedTimeEntry(ctx, userId, { projectId, clientId }),
			);

			const result = await asUser.query(api.time_entries.getRecentProjects, {});
			expect(result).toHaveLength(1);
			expect(result[0].projectName).toBe("Main Project");
			expect(result[0].clientName).toBe("Acme Corp");
			expect(result[0].clientId).toBe(clientId);
		});
	});

	describe("getRunningTimer", () => {
		test("returns running timer with resolved edges", async () => {
			const t = createTest();
			const { userId, asUser } = await authenticateAs(t);
			const clientId = await t.run(async (ctx) =>
				seedClient(ctx, userId, "Acme"),
			);

			await asUser.mutation(api.time_entries.create, {
				name: "Running",
				clientId,
			});

			const result = await asUser.query(api.time_entries.getRunningTimer, {});

			expect(result).not.toBeNull();
			expect(result!.name).toBe("Running");
			expect(result!.client).not.toBeNull();
			expect(result!.client!.name).toBe("Acme");
		});

		test("returns null when no running timer", async () => {
			const t = createTest();
			const { asUser } = await authenticateAs(t);

			const result = await asUser.query(api.time_entries.getRunningTimer, {});

			expect(result).toBeNull();
		});
	});
});
