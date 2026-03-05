import { describe, expect, it } from "vitest";

import {
	advanceOneLocalDay,
	computeNextTiming,
	formatLocalDate,
	getEndOfDay,
	getLocalDayEnd,
	getLocalDayStart,
	getStartOfDay,
	updateIfDefined,
} from "./utils";

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

describe("getLocalDayStart", () => {
	// EST = UTC-5 → offsetMs = -5 * 60 * 60 * 1000 = -18000000
	const EST_OFFSET = -5 * 3600000;
	// IST = UTC+5:30 → offsetMs = 5.5 * 60 * 60 * 1000 = 19800000
	const IST_OFFSET = 5.5 * 3600000;

	it("returns UTC midnight for UTC offset", () => {
		// 2026-02-20T14:30:00Z
		const ts = Date.UTC(2026, 1, 20, 14, 30, 0);
		const result = getLocalDayStart(ts, 0);
		expect(result).toBe(Date.UTC(2026, 1, 20, 0, 0, 0));
	});

	it("returns correct day start for EST (UTC-5)", () => {
		// 2026-02-20T03:00:00Z = 2026-02-19T22:00:00 EST
		// Local day start is 2026-02-19T00:00:00 EST = 2026-02-19T05:00:00Z
		const ts = Date.UTC(2026, 1, 20, 3, 0, 0);
		const result = getLocalDayStart(ts, EST_OFFSET);
		expect(result).toBe(Date.UTC(2026, 1, 19, 5, 0, 0));
	});

	it("returns correct day start for IST (UTC+5:30)", () => {
		// 2026-02-20T20:00:00Z = 2026-02-21T01:30:00 IST
		// Local day start is 2026-02-21T00:00:00 IST = 2026-02-20T18:30:00Z
		const ts = Date.UTC(2026, 1, 20, 20, 0, 0);
		const result = getLocalDayStart(ts, IST_OFFSET);
		expect(result).toBe(Date.UTC(2026, 1, 20, 18, 30, 0));
	});
});

describe("getLocalDayEnd", () => {
	const EST_OFFSET = -5 * 3600000;

	it("returns 23:59:59.999 in local time", () => {
		const ts = Date.UTC(2026, 1, 20, 14, 30, 0);
		const dayStart = getLocalDayStart(ts, EST_OFFSET);
		const dayEnd = getLocalDayEnd(ts, EST_OFFSET);
		// Day should span exactly 86399999ms
		expect(dayEnd - dayStart).toBe(86_400_000 - 1);
	});
});

describe("formatLocalDate", () => {
	const EST_OFFSET = -5 * 3600000;

	it("formats date in local timezone", () => {
		// 2026-02-20T03:00:00Z = 2026-02-19T22:00:00 EST
		const ts = Date.UTC(2026, 1, 20, 3, 0, 0);
		expect(formatLocalDate(ts, EST_OFFSET)).toBe("2026-02-19");
	});

	it("formats date in UTC", () => {
		const ts = Date.UTC(2026, 1, 20, 14, 30, 0);
		expect(formatLocalDate(ts, 0)).toBe("2026-02-20");
	});
});

describe("advanceOneLocalDay", () => {
	const EST_OFFSET = -5 * 3600000;

	it("advances by exactly one day", () => {
		const ts = Date.UTC(2026, 1, 20, 14, 30, 0);
		const dayStart = getLocalDayStart(ts, EST_OFFSET);
		const nextDayStart = advanceOneLocalDay(dayStart, EST_OFFSET);
		expect(nextDayStart - dayStart).toBe(86_400_000);
	});
});
