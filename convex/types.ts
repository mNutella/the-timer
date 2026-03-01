import type { GenericEnt, GenericEntWriter, PromiseOrderedQuery } from "convex-ents";
import type { CustomCtx } from "convex-helpers/server/customFunctions";

import type { TableNames } from "./_generated/dataModel";
import type { mutation, query } from "./functions";
import type { entDefinitions } from "./schema";

export type QueryCtx = CustomCtx<typeof query>;
export type MutationCtx = CustomCtx<typeof mutation>;

export type Ent<TableName extends TableNames> = GenericEnt<typeof entDefinitions, TableName>;
export type EntWriter<TableName extends TableNames> = GenericEntWriter<
	typeof entDefinitions,
	TableName
>;

// Query builder type for expressions like ctx.table("...").search(...)
export type EntQuery<TableName extends TableNames> = PromiseOrderedQuery<
	typeof entDefinitions,
	TableName
>;
