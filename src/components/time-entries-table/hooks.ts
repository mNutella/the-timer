import { useMutation } from "convex/react";
import { createElement } from "react";
import type { DateRange } from "react-day-picker";
import { toast } from "sonner";

import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { useStablePaginatedQuery } from "@/hooks/useStablePaginatedQuery";
import {
	optimisticBulkDeleteTimeEntries,
	optimisticBulkUpdateTimeEntries,
	optimisticCreateTimer,
	optimisticDeleteTimeEntry,
	optimisticStopTimer,
	optimisticUpdateTimeEntry,
	optimisticUpdateTimeEntryCategory,
	optimisticUpdateTimeEntryClient,
	optimisticUpdateTimeEntryProject,
} from "@/lib/optimistic-updates";
import { parseDurationToMilliseconds } from "@/lib/utils";

import type { Category, Client, Project, TimeEntry } from "../../lib/types";

export const CELL_INPUT_CLASS =
	"w-full justify-start border-transparent bg-transparent px-4 shadow-none hover:bg-input/30 focus-visible:border focus-visible:bg-background dark:bg-transparent dark:hover:bg-input/30 dark:focus-visible:bg-input/30 truncate";

export function SaveHint({ visible }: { visible: boolean }) {
	if (!visible) return null;
	return createElement(
		"span",
		{
			className:
				"absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] text-muted-foreground animate-in fade-in duration-150 pointer-events-none",
		},
		createElement(
			"kbd",
			{
				className: "px-1 py-0.5 rounded bg-muted border border-border text-[10px] font-mono",
			},
			"\u21B5",
		),
		"save",
	);
}

export function useUpdateTimeEntryName(timeEntryId: Id<"time_entries">) {
	const update = useMutation(api.time_entries.update).withOptimisticUpdate(
		optimisticUpdateTimeEntry,
	);
	return (name: string) =>
		update({ id: timeEntryId, name }).catch(() => toast.error("Failed to update name"));
}

export function useUpdateTimeEntryClient(timeEntryId: Id<"time_entries">) {
	const update = useMutation(api.time_entries.updateClient).withOptimisticUpdate(
		optimisticUpdateTimeEntryClient,
	);
	return (clientId?: Id<"clients">, newClientName?: string) =>
		update({ timeEntryId, clientId, newClientName }).catch(() =>
			toast.error("Failed to update client"),
		);
}

export function useUpdateTimeEntryProject(timeEntryId: Id<"time_entries">) {
	const update = useMutation(api.time_entries.updateProject).withOptimisticUpdate(
		optimisticUpdateTimeEntryProject,
	);
	return (projectId?: Id<"projects">, newProjectName?: string) =>
		update({ timeEntryId, projectId, newProjectName }).catch(() =>
			toast.error("Failed to update project"),
		);
}

export function useUpdateTimeEntryCategory(timeEntryId: Id<"time_entries">) {
	const update = useMutation(api.time_entries.updateCategory).withOptimisticUpdate(
		optimisticUpdateTimeEntryCategory,
	);
	return (categoryId?: Id<"categories">, newCategoryName?: string) =>
		update({ timeEntryId, categoryId, newCategoryName }).catch(() =>
			toast.error("Failed to update category"),
		);
}

export function useUpdateDuration(timeEntryId: Id<"time_entries">) {
	const update = useMutation(api.time_entries.update).withOptimisticUpdate(
		optimisticUpdateTimeEntry,
	);
	return (duration: string) =>
		update({
			id: timeEntryId,
			duration: parseDurationToMilliseconds(duration),
		}).catch(() => toast.error("Failed to update duration"));
}

export function useUpdateStartEndTime(timeEntryId: Id<"time_entries">) {
	const update = useMutation(api.time_entries.update).withOptimisticUpdate(
		optimisticUpdateTimeEntry,
	);
	return (startDate: number, endDate: number) =>
		update({ id: timeEntryId, startDate, endDate }).catch(() =>
			toast.error("Failed to update start/end time"),
		);
}

export function useDeleteTimeEntry(timeEntryId: Id<"time_entries">) {
	const remove = useMutation(api.time_entries.deleteOne).withOptimisticUpdate(
		optimisticDeleteTimeEntry,
	);
	return () => remove({ id: timeEntryId }).catch(() => toast.error("Failed to delete time entry"));
}

export function useStartStopTimeEntry(timeEntryId: Id<"time_entries">) {
	const start = useMutation(api.time_entries.create).withOptimisticUpdate(optimisticCreateTimer);
	const stop = useMutation(api.time_entries.stop).withOptimisticUpdate(optimisticStopTimer);

	return {
		startTimer: () =>
			start({ name: "", timeEntryId }).catch(() => toast.error("Failed to start timer")),
		stopTimer: () => stop({ id: timeEntryId }).catch(() => toast.error("Failed to stop timer")),
	};
}

export function useUpdateTimeEntryDetails(timeEntryId: Id<"time_entries">) {
	const update = useMutation(api.time_entries.update).withOptimisticUpdate(
		optimisticUpdateTimeEntry,
	);
	return (fields: { notes?: string }) =>
		update({ id: timeEntryId, ...fields }).catch(() => toast.error("Failed to update notes"));
}

export function useDuplicateTimeEntry(timeEntryId: Id<"time_entries">) {
	const create = useMutation(api.time_entries.create).withOptimisticUpdate(optimisticCreateTimer);
	return () =>
		create({ name: "", timeEntryId }).catch(() => toast.error("Failed to duplicate entry"));
}

export function useBulkDeleteTimeEntries() {
	const remove = useMutation(api.time_entries.bulkDelete).withOptimisticUpdate(
		optimisticBulkDeleteTimeEntries,
	);
	return (ids: Id<"time_entries">[]) =>
		remove({ ids }).catch(() => toast.error("Failed to delete entries"));
}

export function useBulkUpdateTimeEntries() {
	const update = useMutation(api.time_entries.bulkUpdate).withOptimisticUpdate(
		optimisticBulkUpdateTimeEntries,
	);
	return (
		ids: Id<"time_entries">[],
		fields: {
			clientId?: Id<"clients">;
			projectId?: Id<"projects">;
			categoryId?: Id<"categories">;
		},
	) => update({ ids, ...fields }).catch(() => toast.error("Failed to update entries"));
}

export function useTimeEntries(
	searchValue: string,
	filterByClients: Client[],
	filterByProjects: Project[],
	filterByCategories: Category[],
	filterByTimeRange?: DateRange,
) {
	return useStablePaginatedQuery<TimeEntry, typeof api.time_entries.searchTimeEntries>(
		api.time_entries.searchTimeEntries,
		{
			filters: {
				name: searchValue,
				clientIds: filterByClients.map((c) => c._id),
				projectIds: filterByProjects.map((p) => p._id),
				categoryIds: filterByCategories.map((c) => c._id),
				dateRange: {
					startDate: filterByTimeRange?.from?.getTime(),
					endDate: filterByTimeRange?.to?.getTime(),
				},
			},
			include: { client: true, project: true, category: true, tags: true },
		},
		{ initialNumItems: 10 },
	);
}
