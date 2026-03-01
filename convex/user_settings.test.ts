import { expect, test, describe } from "vitest";

import { api } from "./_generated/api";
import { authenticateAs, createTest } from "./setup.testing";

describe("user_settings", () => {
	describe("get", () => {
		test("returns null when no settings exist", async () => {
			const t = createTest();
			const { asUser } = await authenticateAs(t);

			const result = await asUser.query(api.user_settings.get, {});
			expect(result).toBeNull();
		});

		test("returns settings after upsert", async () => {
			const t = createTest();
			const { asUser } = await authenticateAs(t);

			await asUser.mutation(api.user_settings.upsert, {
				default_hourly_rate: 10000,
			});

			const result = await asUser.query(api.user_settings.get, {});
			expect(result).not.toBeNull();
			expect(result!.default_hourly_rate).toBe(10000);
		});
	});

	describe("upsert", () => {
		test("creates settings with rate", async () => {
			const t = createTest();
			const { asUser } = await authenticateAs(t);

			await asUser.mutation(api.user_settings.upsert, {
				default_hourly_rate: 15000,
			});

			const result = await asUser.query(api.user_settings.get, {});
			expect(result!.default_hourly_rate).toBe(15000);
		});

		test("defaults currency to USD", async () => {
			const t = createTest();
			const { asUser } = await authenticateAs(t);

			await asUser.mutation(api.user_settings.upsert, {
				default_hourly_rate: 10000,
			});

			const result = await asUser.query(api.user_settings.get, {});
			expect(result!.default_currency).toBe("USD");
		});

		test("updates existing without overwriting unset fields", async () => {
			const t = createTest();
			const { asUser } = await authenticateAs(t);

			await asUser.mutation(api.user_settings.upsert, {
				default_hourly_rate: 10000,
				default_currency: "EUR",
			});

			// Update only the rate — currency should stay EUR
			await asUser.mutation(api.user_settings.upsert, {
				default_hourly_rate: 20000,
			});

			const result = await asUser.query(api.user_settings.get, {});
			expect(result!.default_hourly_rate).toBe(20000);
			expect(result!.default_currency).toBe("EUR");
		});
	});
});
