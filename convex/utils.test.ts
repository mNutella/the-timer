import { describe, expect, it } from "vitest";

import { computeNextTiming, getEndOfDay, getStartOfDay, updateIfDefined } from "./utils";

describe("computeNextTiming", () => {
	it("computes end_time from startDate + duration", () => {
		const result = computeNextTiming({
			startDate: 1000,
			duration: 500,
		});

		expect(result.start_time).toBe(1000);
		expect(result.end_time).toBe(1500);
		expect(result.duration).toBe(500);
	});

	it("computes start_time from endDate + duration", () => {
		const result = computeNextTiming({
			endDate: 2000,
			duration: 500,
		});

		expect(result.start_time).toBe(1500);
		expect(result.end_time).toBe(2000);
		expect(result.duration).toBe(500);
	});

	it("computes duration from startDate + endDate", () => {
		const result = computeNextTiming({
			startDate: 1000,
			endDate: 3000,
		});

		expect(result.start_time).toBe(1000);
		expect(result.end_time).toBe(3000);
		expect(result.duration).toBe(2000);
	});

	it("throws when endDate is before startDate", () => {
		expect(() =>
			computeNextTiming({
				startDate: 3000,
				endDate: 1000,
			}),
		).toThrow("end_time cannot be before start_time");
	});

	it("falls back to currentStart/currentEnd when startDate/endDate not provided", () => {
		const result = computeNextTiming({
			currentStart: 1000,
			currentEnd: 2000,
		});

		expect(result.start_time).toBe(1000);
		expect(result.end_time).toBe(2000);
		expect(result.duration).toBe(1000);
	});
});

describe("getStartOfDay", () => {
	it("sets time to 00:00:00.000", () => {
		// Feb 20, 2026 at 14:30:45.123
		const midDay = new Date(2026, 1, 20, 14, 30, 45, 123).getTime();
		const result = getStartOfDay(midDay);
		const date = new Date(result);

		expect(date.getHours()).toBe(0);
		expect(date.getMinutes()).toBe(0);
		expect(date.getSeconds()).toBe(0);
		expect(date.getMilliseconds()).toBe(0);
		expect(date.getDate()).toBe(20);
	});
});

describe("getEndOfDay", () => {
	it("sets time to 23:59:59.999", () => {
		const midDay = new Date(2026, 1, 20, 14, 30, 45, 123).getTime();
		const result = getEndOfDay(midDay);
		const date = new Date(result);

		expect(date.getHours()).toBe(23);
		expect(date.getMinutes()).toBe(59);
		expect(date.getSeconds()).toBe(59);
		expect(date.getMilliseconds()).toBe(999);
		expect(date.getDate()).toBe(20);
	});
});

describe("updateIfDefined", () => {
	it("copies only defined keys to target", () => {
		const target: Partial<{ a: number; b: string; c: boolean }> = { a: 1 };
		updateIfDefined(target, { b: "hello", c: true });

		expect(target).toEqual({ a: 1, b: "hello", c: true });
	});

	it("skips undefined values", () => {
		const target: Partial<{ a: number; b: string }> = { a: 1, b: "old" };
		updateIfDefined(target, { a: undefined, b: "new" });

		expect(target).toEqual({ a: 1, b: "new" });
	});
});
