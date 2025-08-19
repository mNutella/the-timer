import { api } from "convex/_generated/api";
import { UsePaginatedQueryReturnType } from "convex/react";

type TimeEntriesPaginatedResult = UsePaginatedQueryReturnType<
	typeof api.time_entries.getAll
>;
export type TimeEntry = TimeEntriesPaginatedResult["results"][number];
export type Activity = TimeEntry["activity"];
export type Client = TimeEntry["activity"]["client"];
export type Project = TimeEntry["activity"]["project"];
export type Category = TimeEntry["activity"]["category"];
export type Tags = TimeEntry["activity"]["tags"];
