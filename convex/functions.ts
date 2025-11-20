/* eslint-disable no-restricted-imports */
import {
	mutation as rawMutation,
	internalMutation as rawInternalMutation,
	query as rawQuery,
	internalQuery as rawInternalQuery,
} from "./_generated/server";
/* eslint-enable no-restricted-imports */
import {
	customCtx,
	customMutation,
	customQuery,
} from "convex-helpers/server/customFunctions";
import { entsTableFactory } from "convex-ents";
import { Triggers } from "convex-helpers/server/triggers";

import { entDefinitions } from "./schema";
import type { DataModel } from "./_generated/dataModel";
import {
  timeEntriesTotalDurationByCategoryAndDateAggregate,
  timeEntriesTotalDurationByClientAndDateAggregate,
	// timeEntriesByUserAggregate,
	timeEntriesTotalDurationByDateAggregate,
  timeEntriesTotalDurationByProjectAndDateAggregate,
} from "./aggregates";

const triggers = new Triggers<DataModel>();

// triggers.register("time_entries", timeEntriesByUserAggregate.trigger());
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
