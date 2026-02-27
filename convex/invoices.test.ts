import { expect, test, describe } from "vitest";
import { api } from "./_generated/api";
import {
	authenticateAs,
	createTest,
	seedClient,
	seedInvoice,
	seedProject,
	seedTimeEntry,
} from "./setup.testing";

// Shared constants for date ranges
const START = 1700000000000;
const END = 1700100000000;
const ONE_HOUR = 3600000;

describe("invoices", () => {
	describe("create + getById", () => {
		test("creates invoice and retrieves by ID", async () => {
			const t = createTest();
			const { asUser } = await authenticateAs(t);

			const id = await asUser.mutation(api.invoices.create, {
				number: "INV-001",
				startDate: START,
				endDate: END,
				lineItems: [
					{
						label: "Dev work",
						duration_ms: ONE_HOUR,
						rate_cents: 10000,
						amount_cents: 10000,
					},
				],
				subtotal_cents: 10000,
				notes: "Test invoice",
			});

			const invoice = await asUser.query(api.invoices.getById, { id });
			expect(invoice.number).toBe("INV-001");
			expect(invoice.subtotal_cents).toBe(10000);
			expect(invoice.notes).toBe("Test invoice");
			expect(invoice.line_items).toHaveLength(1);
		});

		test("resolves clientName when client provided", async () => {
			const t = createTest();
			const { userId, asUser } = await authenticateAs(t);
			const clientId = await t.run(async (ctx) =>
				seedClient(ctx, userId, "Acme Corp"),
			);

			const id = await asUser.mutation(api.invoices.create, {
				clientId,
				startDate: START,
				endDate: END,
				lineItems: [],
				subtotal_cents: 0,
			});

			const invoice = await asUser.query(api.invoices.getById, { id });
			expect(invoice.clientName).toBe("Acme Corp");
		});

		test("returns null clientName when no client", async () => {
			const t = createTest();
			const { asUser } = await authenticateAs(t);

			const id = await asUser.mutation(api.invoices.create, {
				startDate: START,
				endDate: END,
				lineItems: [],
				subtotal_cents: 0,
			});

			const invoice = await asUser.query(api.invoices.getById, { id });
			expect(invoice.clientName).toBeNull();
		});
	});

	describe("update", () => {
		test("updates number and notes", async () => {
			const t = createTest();
			const { asUser } = await authenticateAs(t);

			const id = await asUser.mutation(api.invoices.create, {
				number: "INV-001",
				startDate: START,
				endDate: END,
				lineItems: [],
				subtotal_cents: 0,
			});

			await asUser.mutation(api.invoices.update, {
				id,
				number: "INV-002",
				notes: "Updated notes",
			});

			const invoice = await asUser.query(api.invoices.getById, { id });
			expect(invoice.number).toBe("INV-002");
			expect(invoice.notes).toBe("Updated notes");
		});

		test("throws for wrong userId", async () => {
			const t = createTest();
			const { asUser: asUser1 } = await authenticateAs(t, {
				email: "u1@test.com",
			});
			const { asUser: asUser2 } = await authenticateAs(t, {
				email: "u2@test.com",
			});

			const id = await asUser1.mutation(api.invoices.create, {
				startDate: START,
				endDate: END,
				lineItems: [],
				subtotal_cents: 0,
			});

			await expect(
				asUser2.mutation(api.invoices.update, { id, notes: "hack" }),
			).rejects.toThrow();
		});
	});

	describe("deleteOne", () => {
		test("deletes invoice", async () => {
			const t = createTest();
			const { asUser } = await authenticateAs(t);

			const id = await asUser.mutation(api.invoices.create, {
				startDate: START,
				endDate: END,
				lineItems: [],
				subtotal_cents: 0,
			});

			await asUser.mutation(api.invoices.deleteOne, { id });

			await expect(
				asUser.query(api.invoices.getById, { id }),
			).rejects.toThrow();
		});

		test("throws for wrong userId", async () => {
			const t = createTest();
			const { asUser: asUser1 } = await authenticateAs(t, {
				email: "u1@test.com",
			});
			const { asUser: asUser2 } = await authenticateAs(t, {
				email: "u2@test.com",
			});

			const id = await asUser1.mutation(api.invoices.create, {
				startDate: START,
				endDate: END,
				lineItems: [],
				subtotal_cents: 0,
			});

			await expect(
				asUser2.mutation(api.invoices.deleteOne, { id }),
			).rejects.toThrow();
		});
	});

	describe("list", () => {
		test("returns user's invoices, not other users'", async () => {
			const t = createTest();
			const { userId: userId1, asUser: asUser1 } = await authenticateAs(t, {
				email: "u1@test.com",
			});
			const { userId: userId2, asUser: asUser2 } = await authenticateAs(t, {
				email: "u2@test.com",
			});

			await t.run(async (ctx) =>
				seedInvoice(ctx, userId1, { number: "INV-001" }),
			);
			await t.run(async (ctx) =>
				seedInvoice(ctx, userId2, { number: "INV-002" }),
			);

			const list1 = await asUser1.query(api.invoices.list, {});
			const list2 = await asUser2.query(api.invoices.list, {});

			expect(list1).toHaveLength(1);
			expect(list1[0].number).toBe("INV-001");
			expect(list2).toHaveLength(1);
			expect(list2[0].number).toBe("INV-002");
		});

		test("resolves client names", async () => {
			const t = createTest();
			const { userId, asUser } = await authenticateAs(t);
			const clientId = await t.run(async (ctx) =>
				seedClient(ctx, userId, "Acme"),
			);

			await t.run(async (ctx) => seedInvoice(ctx, userId, { clientId }));

			const invoices = await asUser.query(api.invoices.list, {});
			expect(invoices[0].clientName).toBe("Acme");
		});
	});

	describe("getLastEndDate", () => {
		test("returns null when no invoices", async () => {
			const t = createTest();
			const { asUser } = await authenticateAs(t);

			const result = await asUser.query(api.invoices.getLastEndDate, {});
			expect(result).toBeNull();
		});

		test("returns most recent end_date", async () => {
			const t = createTest();
			const { userId, asUser } = await authenticateAs(t);

			await t.run(async (ctx) =>
				seedInvoice(ctx, userId, { end_date: 1000 }),
			);
			await t.run(async (ctx) =>
				seedInvoice(ctx, userId, { end_date: 3000 }),
			);
			await t.run(async (ctx) =>
				seedInvoice(ctx, userId, { end_date: 2000 }),
			);

			const result = await asUser.query(api.invoices.getLastEndDate, {});
			expect(result).toBe(3000);
		});

		test("filters by clientId", async () => {
			const t = createTest();
			const { userId, asUser } = await authenticateAs(t);
			const clientA = await t.run(async (ctx) =>
				seedClient(ctx, userId, "Client A"),
			);
			const clientB = await t.run(async (ctx) =>
				seedClient(ctx, userId, "Client B"),
			);

			await t.run(async (ctx) =>
				seedInvoice(ctx, userId, { clientId: clientA, end_date: 3000 }),
			);
			await t.run(async (ctx) =>
				seedInvoice(ctx, userId, { clientId: clientB, end_date: 5000 }),
			);

			const result = await asUser.query(api.invoices.getLastEndDate, {
				clientId: clientA,
			});
			expect(result).toBe(3000);
		});
	});

	describe("getUnbilledTotal", () => {
		test("returns zeros when no entries", async () => {
			const t = createTest();
			const { asUser } = await authenticateAs(t);

			const result = await asUser.query(api.invoices.getUnbilledTotal, {});
			expect(result.amount_cents).toBe(0);
			expect(result.duration_ms).toBe(0);
			expect(result.entry_count).toBe(0);
		});

		test("calculates total from billable entries with correct rates", async () => {
			const t = createTest();
			const { userId, asUser } = await authenticateAs(t);
			const clientId = await t.run(async (ctx) =>
				seedClient(ctx, userId, "Acme", { hourly_rate_cents: 10000 }),
			);

			// 1 hour of work, billable (has clientId)
			await t.run(async (ctx) =>
				seedTimeEntry(ctx, userId, {
					clientId,
					start_time: START,
					end_time: START + ONE_HOUR,
					duration: ONE_HOUR,
				}),
			);

			const result = await asUser.query(api.invoices.getUnbilledTotal, {});
			expect(result.entry_count).toBe(1);
			expect(result.duration_ms).toBe(ONE_HOUR);
			expect(result.amount_cents).toBe(10000); // 1hr * $100/hr
		});

		test("excludes running timers (no end_time)", async () => {
			const t = createTest();
			const { userId, asUser } = await authenticateAs(t);
			const clientId = await t.run(async (ctx) =>
				seedClient(ctx, userId, "Acme", { hourly_rate_cents: 10000 }),
			);

			// Running timer — no end_time
			await t.run(async (ctx) =>
				seedTimeEntry(ctx, userId, {
					clientId,
					start_time: START,
				}),
			);

			const result = await asUser.query(api.invoices.getUnbilledTotal, {});
			expect(result.entry_count).toBe(0);
		});

		test("only counts entries after last invoice", async () => {
			const t = createTest();
			const { userId, asUser } = await authenticateAs(t);
			const clientId = await t.run(async (ctx) =>
				seedClient(ctx, userId, "Acme", { hourly_rate_cents: 10000 }),
			);

			// Entry before the invoice period
			await t.run(async (ctx) =>
				seedTimeEntry(ctx, userId, {
					clientId,
					start_time: 1000,
					end_time: 1000 + ONE_HOUR,
					duration: ONE_HOUR,
				}),
			);

			// Invoice covering that period
			await t.run(async (ctx) =>
				seedInvoice(ctx, userId, { end_date: 2000 }),
			);

			// Entry after the invoice
			await t.run(async (ctx) =>
				seedTimeEntry(ctx, userId, {
					clientId,
					start_time: 3000,
					end_time: 3000 + ONE_HOUR,
					duration: ONE_HOUR,
				}),
			);

			const result = await asUser.query(api.invoices.getUnbilledTotal, {});
			expect(result.entry_count).toBe(1);
			expect(result.amount_cents).toBe(10000);
		});
	});

	describe("previewLineItems", () => {
		test("returns empty when no entries in range", async () => {
			const t = createTest();
			const { asUser } = await authenticateAs(t);

			const result = await asUser.query(api.invoices.previewLineItems, {
				startDate: START,
				endDate: END,
				groupingRules: [],
				mergeEntries: false,
				includeDateRange: false,
				includeDuration: false,
			});

			expect(result.lineItems).toHaveLength(0);
			expect(result.entry_count).toBe(0);
		});

		test("excludes non-billable entries", async () => {
			const t = createTest();
			const { userId, asUser } = await authenticateAs(t);

			// Non-billable entry (no client, billable not set)
			await t.run(async (ctx) =>
				seedTimeEntry(ctx, userId, {
					name: "Internal work",
					start_time: START + 1000,
					end_time: START + 1000 + ONE_HOUR,
					duration: ONE_HOUR,
				}),
			);

			const result = await asUser.query(api.invoices.previewLineItems, {
				startDate: START,
				endDate: END,
				groupingRules: [],
				mergeEntries: false,
				includeDateRange: false,
				includeDuration: false,
			});

			expect(result.entry_count).toBe(0);
		});

		test("includes auto-billable entries (has client)", async () => {
			const t = createTest();
			const { userId, asUser } = await authenticateAs(t);
			const clientId = await t.run(async (ctx) =>
				seedClient(ctx, userId, "Acme", { hourly_rate_cents: 10000 }),
			);

			await t.run(async (ctx) =>
				seedTimeEntry(ctx, userId, {
					name: "Client work",
					clientId,
					start_time: START + 1000,
					end_time: START + 1000 + ONE_HOUR,
					duration: ONE_HOUR,
				}),
			);

			const result = await asUser.query(api.invoices.previewLineItems, {
				startDate: START,
				endDate: END,
				groupingRules: [],
				mergeEntries: false,
				includeDateRange: false,
				includeDuration: false,
			});

			expect(result.entry_count).toBe(1);
		});

		test("calculates correct amount using rate hierarchy", async () => {
			const t = createTest();
			const { userId, asUser } = await authenticateAs(t);
			const clientId = await t.run(async (ctx) =>
				seedClient(ctx, userId, "Acme", { hourly_rate_cents: 10000 }),
			);
			const projectId = await t.run(async (ctx) =>
				seedProject(ctx, userId, {
					clientId,
					hourly_rate_cents: 15000,
				}),
			);

			// 1 hour — project rate (15000) should override client rate (10000)
			await t.run(async (ctx) =>
				seedTimeEntry(ctx, userId, {
					name: "Project work",
					clientId,
					projectId,
					start_time: START + 1000,
					end_time: START + 1000 + ONE_HOUR,
					duration: ONE_HOUR,
				}),
			);

			const result = await asUser.query(api.invoices.previewLineItems, {
				startDate: START,
				endDate: END,
				groupingRules: [],
				mergeEntries: false,
				includeDateRange: false,
				includeDuration: false,
			});

			expect(result.subtotal_cents).toBe(15000);
		});

		test("groups entries by client dimension", async () => {
			const t = createTest();
			const { userId, asUser } = await authenticateAs(t);
			const clientA = await t.run(async (ctx) =>
				seedClient(ctx, userId, "Client A", { hourly_rate_cents: 10000 }),
			);
			const clientB = await t.run(async (ctx) =>
				seedClient(ctx, userId, "Client B", { hourly_rate_cents: 10000 }),
			);

			await t.run(async (ctx) =>
				seedTimeEntry(ctx, userId, {
					name: "Work A",
					clientId: clientA,
					start_time: START + 1000,
					end_time: START + 1000 + ONE_HOUR,
					duration: ONE_HOUR,
				}),
			);
			await t.run(async (ctx) =>
				seedTimeEntry(ctx, userId, {
					name: "Work B",
					clientId: clientB,
					start_time: START + 2000,
					end_time: START + 2000 + ONE_HOUR,
					duration: ONE_HOUR,
				}),
			);

			const result = await asUser.query(api.invoices.previewLineItems, {
				startDate: START,
				endDate: END,
				groupingRules: [{ group_by: "client" }],
				mergeEntries: true,
				includeDateRange: false,
				includeDuration: false,
			});

			expect(result.lineItems).toHaveLength(2);
			const labels = result.lineItems.map(
				(li: { label: string }) => li.label,
			);
			expect(labels).toContain("Client A");
			expect(labels).toContain("Client B");
		});

		test("groups entries by project dimension", async () => {
			const t = createTest();
			const { userId, asUser } = await authenticateAs(t);
			const clientId = await t.run(async (ctx) =>
				seedClient(ctx, userId, "Acme", { hourly_rate_cents: 10000 }),
			);
			const projectA = await t.run(async (ctx) =>
				seedProject(ctx, userId, {
					name: "Project Alpha",
					clientId,
					hourly_rate_cents: 10000,
				}),
			);
			const projectB = await t.run(async (ctx) =>
				seedProject(ctx, userId, {
					name: "Project Beta",
					clientId,
					hourly_rate_cents: 10000,
				}),
			);

			await t.run(async (ctx) =>
				seedTimeEntry(ctx, userId, {
					name: "Task 1",
					clientId,
					projectId: projectA,
					start_time: START + 1000,
					end_time: START + 1000 + ONE_HOUR,
					duration: ONE_HOUR,
				}),
			);
			await t.run(async (ctx) =>
				seedTimeEntry(ctx, userId, {
					name: "Task 2",
					clientId,
					projectId: projectB,
					start_time: START + 2000,
					end_time: START + 2000 + ONE_HOUR,
					duration: ONE_HOUR,
				}),
			);

			const result = await asUser.query(api.invoices.previewLineItems, {
				startDate: START,
				endDate: END,
				groupingRules: [{ group_by: "project" }],
				mergeEntries: true,
				includeDateRange: false,
				includeDuration: false,
			});

			expect(result.lineItems).toHaveLength(2);
			const labels = result.lineItems.map(
				(li: { label: string }) => li.label,
			);
			expect(labels).toContain("Project Alpha");
			expect(labels).toContain("Project Beta");
		});

		test("merges entries within groups", async () => {
			const t = createTest();
			const { userId, asUser } = await authenticateAs(t);
			const clientId = await t.run(async (ctx) =>
				seedClient(ctx, userId, "Acme", { hourly_rate_cents: 10000 }),
			);

			// Two entries for the same client
			await t.run(async (ctx) =>
				seedTimeEntry(ctx, userId, {
					name: "Work 1",
					clientId,
					start_time: START + 1000,
					end_time: START + 1000 + ONE_HOUR,
					duration: ONE_HOUR,
				}),
			);
			await t.run(async (ctx) =>
				seedTimeEntry(ctx, userId, {
					name: "Work 2",
					clientId,
					start_time: START + 5000,
					end_time: START + 5000 + ONE_HOUR,
					duration: ONE_HOUR,
				}),
			);

			const result = await asUser.query(api.invoices.previewLineItems, {
				startDate: START,
				endDate: END,
				groupingRules: [{ group_by: "client" }],
				mergeEntries: true,
				includeDateRange: false,
				includeDuration: false,
			});

			// Should merge into 1 line item (both same client)
			expect(result.lineItems).toHaveLength(1);
			expect(result.lineItems[0].duration_ms).toBe(ONE_HOUR * 2);
			expect(result.lineItems[0].amount_cents).toBe(20000);
		});

		test("includes date range in label when enabled", async () => {
			const t = createTest();
			const { userId, asUser } = await authenticateAs(t);
			const clientId = await t.run(async (ctx) =>
				seedClient(ctx, userId, "Acme", { hourly_rate_cents: 10000 }),
			);

			await t.run(async (ctx) =>
				seedTimeEntry(ctx, userId, {
					name: "Work",
					clientId,
					start_time: START + 1000,
					end_time: START + 1000 + ONE_HOUR,
					duration: ONE_HOUR,
				}),
			);

			const result = await asUser.query(api.invoices.previewLineItems, {
				startDate: START,
				endDate: END,
				groupingRules: [],
				mergeEntries: false,
				includeDateRange: true,
				includeDuration: false,
			});

			expect(result.lineItems[0].label).toContain(" - ");
		});

		test("includes duration in label when enabled", async () => {
			const t = createTest();
			const { userId, asUser } = await authenticateAs(t);
			const clientId = await t.run(async (ctx) =>
				seedClient(ctx, userId, "Acme", { hourly_rate_cents: 10000 }),
			);

			await t.run(async (ctx) =>
				seedTimeEntry(ctx, userId, {
					name: "Work",
					clientId,
					start_time: START + 1000,
					end_time: START + 1000 + ONE_HOUR,
					duration: ONE_HOUR,
				}),
			);

			const result = await asUser.query(api.invoices.previewLineItems, {
				startDate: START,
				endDate: END,
				groupingRules: [],
				mergeEntries: false,
				includeDateRange: false,
				includeDuration: true,
			});

			// Should contain "1h 00m"
			expect(result.lineItems[0].label).toContain("1h 00m");
		});
	});
});
