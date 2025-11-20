import type { api } from "@/../convex/_generated/api";
import type { UsePaginatedQueryReturnType } from "convex/react";

type TimeEntriesPaginatedResult = UsePaginatedQueryReturnType<
	typeof api.time_entries.searchTimeEntries
>;
export type TimeEntry = TimeEntriesPaginatedResult["results"][number];
export type Client = TimeEntry["client"];
export type Project = TimeEntry["project"];
export type Category = TimeEntry["category"];
export type Tags = TimeEntry["tags"];