import { entsTableFactory } from "convex-ents";
import {
	customCtx,
	customMutation,
	customQuery,
} from "convex-helpers/server/customFunctions";
import { Triggers } from "convex-helpers/server/triggers";
import type { DataModel } from "./_generated/dataModel";
import {
	internalMutation as rawInternalMutation,
	internalQuery as rawInternalQuery,
	mutation as rawMutation,
	query as rawQuery,
} from "./_generated/server";
import {
	timeEntriesTotalDurationByCategoryAndDateAggregate,
	timeEntriesTotalDurationByClientAndDateAggregate,
	timeEntriesTotalDurationByDateAggregate,
	timeEntriesTotalDurationByProjectAndDateAggregate,
} from "./aggregates";
import { entDefinitions } from "./schema";

const triggers = new Triggers<DataModel>();

if (!process.env.VITEST) {
	triggers.register(
		"time_entries",
		timeEntriesTotalDurationByDateAggregate.trigger(),
	);

	triggers.register(
		"time_entries",
		timeEntriesTotalDurationByClientAndDateAggregate.trigger(),
	);

	triggers.register(
		"time_entries",
		timeEntriesTotalDurationByProjectAndDateAggregate.trigger(),
	);

	triggers.register(
		"time_entries",
		timeEntriesTotalDurationByCategoryAndDateAggregate.trigger(),
	);
}

export const query = customQuery(
	rawQuery,
	customCtx(async (ctx) => {
		return { table: entsTableFactory(ctx, entDefinitions) };
	}),
);
export const internalQuery = customQuery(
	rawInternalQuery,
	customCtx(async (ctx) => {
		return { table: entsTableFactory(ctx, entDefinitions) };
	}),
);

export const mutation = customMutation(
	rawMutation,
	customCtx(async (ctx) => {
		const wrapped = triggers.wrapDB(ctx);
		return { db: wrapped.db, table: entsTableFactory(wrapped, entDefinitions) };
	}),
);

export const internalMutation = customMutation(
	rawInternalMutation,
	customCtx(async (ctx) => {
		const wrapped = triggers.wrapDB(ctx);
		return { db: wrapped.db, table: entsTableFactory(wrapped, entDefinitions) };
	}),
);
