import { describe, expect, it } from "vitest";
import {
	formatDuration,
	formatTimeForInput,
	getFilterDescription,
	parseDurationToMilliseconds,
} from "./utils";

describe("formatDuration", () => {
	it("formats zero milliseconds as 00:00:00", () => {
		expect(formatDuration(0)).toBe("00:00:00");
	});

	it("formats arbitrary milliseconds as zero-padded HH:MM:SS", () => {
		// 1h 1m 1s = 3661000ms
		expect(formatDuration(3661000)).toBe("01:01:01");
	});

	it("formats large values (100+ hours)", () => {
		// 100h = 360000000ms
		expect(formatDuration(360000000)).toBe("100:00:00");
	});

	it("truncates sub-second precision", () => {
		// 1500ms = 1.5s → should show 00:00:01
		expect(formatDuration(1500)).toBe("00:00:01");
	});
});

describe("parseDurationToMilliseconds", () => {
	it("parses valid HH:MM:SS string", () => {
		expect(parseDurationToMilliseconds("01:30:45")).toBe(5445000);
	});

	it("returns 0 for strings with fewer than 3 parts", () => {
		expect(parseDurationToMilliseconds("30:45")).toBe(0);
		expect(parseDurationToMilliseconds("45")).toBe(0);
		expect(parseDurationToMilliseconds("")).toBe(0);
	});

	it("roundtrips with formatDuration (within 1s precision)", () => {
		const original = 7384000; // 2h 3m 4s
		const formatted = formatDuration(original);
		const parsed = parseDurationToMilliseconds(formatted);

		expect(parsed).toBe(original);
	});
});

describe("formatTimeForInput", () => {
	it("formats a Date as zero-padded HH:MM:SS", () => {
		const date = new Date(2026, 1, 20, 9, 5, 3);
		expect(formatTimeForInput(date)).toBe("09:05:03");
	});

	it("returns empty string for undefined", () => {
		expect(formatTimeForInput(undefined)).toBe("");
	});
});

describe("getFilterDescription", () => {
	it("joins filter names with ' · '", () => {
		const result = getFilterDescription(
			[{ name: "Client A" }],
			[{ name: "Project B" }, { name: "Project C" }],
		);
		expect(result).toBe("Client A · Project B · Project C");
	});

	it("returns undefined for empty filters", () => {
		expect(getFilterDescription([], [])).toBeUndefined();
	});
});
