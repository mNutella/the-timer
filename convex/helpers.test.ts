import { describe, expect, it } from "vitest";

import type { Id } from "./_generated/dataModel";
import { assertOwnership } from "./model/helpers";

describe("assertOwnership", () => {
	const userId = "user123" as Id<"users">;

	it("does not throw when entity belongs to user", () => {
		const entity = { userId };
		expect(() => assertOwnership(entity, userId, "Client")).not.toThrow();
	});

	it("throws when entity belongs to a different user", () => {
		const entity = { userId: "other456" as Id<"users"> };
		expect(() => assertOwnership(entity, userId, "Client")).toThrow(
			"Client does not belong to user",
		);
	});

	it("includes entity type in error message", () => {
		const entity = { userId: "other456" as Id<"users"> };
		expect(() => assertOwnership(entity, userId, "Time entry")).toThrow(
			"Time entry does not belong to user",
		);
	});
});
