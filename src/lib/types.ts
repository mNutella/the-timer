import type { UsePaginatedQueryReturnType } from "convex/react";
import type { api } from "@/../convex/_generated/api";

type TimeEntriesPaginatedResult = UsePaginatedQueryReturnType<
	typeof api.time_entries.searchTimeEntries
>;
export type TimeEntry = TimeEntriesPaginatedResult["results"][number];
export type Client = NonNullable<TimeEntry["client"]>;
export type Project = NonNullable<TimeEntry["project"]>;
export type Category = NonNullable<TimeEntry["category"]>;
export type Tags = NonNullable<TimeEntry["tags"]> | undefined;
