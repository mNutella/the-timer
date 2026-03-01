import { TableAggregate } from "@convex-dev/aggregate";

import { components } from "./_generated/api";
import type { DataModel, Id } from "./_generated/dataModel";
import { getStartOfDay } from "./utils";

export const timeEntriesTotalDurationByDateAggregate = new TableAggregate<{
	Namespace: Id<"users">;
	Key: [number];
	DataModel: DataModel;
	TableName: "time_entries";
}>(components.time_entries_total_duration_by_user, {
	namespace: (doc) => doc.userId,
	sortKey: (doc) => [doc.start_time ?? 0],
	sumValue: (doc) => doc.duration ?? 0,
});

export const timeEntriesTotalDurationByClientAndDateAggregate = new TableAggregate<{
	Namespace: Id<"users">;
	Key: [string, number];
	DataModel: DataModel;
	TableName: "time_entries";
}>(components.time_entries_total_duration_by_client_and_date, {
	namespace: (doc) => doc.userId,
	sortKey: (doc) => [doc.clientId ?? "", getStartOfDay(doc.start_time ?? 0)],
	sumValue: (doc) => doc.duration ?? 0,
});

export const timeEntriesTotalDurationByProjectAndDateAggregate = new TableAggregate<{
	Namespace: Id<"users">;
	Key: [string, number];
	DataModel: DataModel;
	TableName: "time_entries";
}>(components.time_entries_total_duration_by_project_and_date, {
	namespace: (doc) => doc.userId,
	sortKey: (doc) => [doc.projectId ?? "", getStartOfDay(doc.start_time ?? 0)],
	sumValue: (doc) => doc.duration ?? 0,
});

export const timeEntriesTotalDurationByCategoryAndDateAggregate = new TableAggregate<{
	Namespace: Id<"users">;
	Key: [string, number];
	DataModel: DataModel;
	TableName: "time_entries";
}>(components.time_entries_total_duration_by_category_and_date, {
	namespace: (doc) => doc.userId,
	sortKey: (doc) => [doc.categoryId ?? "", getStartOfDay(doc.start_time ?? 0)],
	sumValue: (doc) => doc.duration ?? 0,
});
