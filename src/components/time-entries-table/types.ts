import type { api } from "@/../convex/_generated/api";
import type { UsePaginatedQueryReturnType } from "convex/react";

type TimeEntriesPaginatedResult = UsePaginatedQueryReturnType<
	typeof api.time_entries.searchTimeEntries
>;
export type TimeEntry = TimeEntriesPaginatedResult["results"][number];
export type Client = NonNullable<TimeEntry["client"]> | undefined;
export type Project = NonNullable<TimeEntry["project"]> | undefined;
export type Category = NonNullable<TimeEntry["category"]> | undefined;
export type Tags = NonNullable<TimeEntry["tags"]> | undefined;
