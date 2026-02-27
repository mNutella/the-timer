import { expect, test, describe } from "vitest";
import { isBillable, resolveRate } from "./model/rates";

describe("rates", () => {
	describe("isBillable", () => {
		test("returns true when billable is explicitly true", () => {
			expect(isBillable({ billable: true })).toBe(true);
		});

		test("returns false when billable is explicitly false", () => {
			expect(isBillable({ billable: false })).toBe(false);
		});

		test("returns true when undefined and entry has clientId", () => {
			// biome-ignore lint/suspicious/noExplicitAny: test fake ID
			expect(isBillable({ clientId: "fake-client-id" as any })).toBe(true);
		});

		test("returns false when undefined and no clientId", () => {
			expect(isBillable({})).toBe(false);
		});

		test("explicit true overrides absence of clientId", () => {
			expect(isBillable({ billable: true })).toBe(true);
		});

		test("explicit false overrides presence of clientId", () => {
			// biome-ignore lint/suspicious/noExplicitAny: test fake ID
			expect(isBillable({ billable: false, clientId: "fake-id" as any })).toBe(
				false,
			);
		});
	});

	describe("resolveRate", () => {
		test("uses project rate when set", () => {
			const result = resolveRate(
				{ hourly_rate_cents: 15000 },
				{ hourly_rate_cents: 10000 },
				5000,
			);
			expect(result).toBe(15000);
		});

		test("falls back to client rate when project has no rate", () => {
			const result = resolveRate({}, { hourly_rate_cents: 10000 }, 5000);
			expect(result).toBe(10000);
		});

		test("falls back to default rate when neither has rate", () => {
			const result = resolveRate({}, {}, 5000);
			expect(result).toBe(5000);
		});

		test("returns 0 when no rates available", () => {
			const result = resolveRate(null, null);
			expect(result).toBe(0);
		});

		test("project rate takes priority over client rate when both set", () => {
			const result = resolveRate(
				{ hourly_rate_cents: 20000 },
				{ hourly_rate_cents: 10000 },
			);
			expect(result).toBe(20000);
		});
	});
});
