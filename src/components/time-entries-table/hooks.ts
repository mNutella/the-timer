import { useMutation } from "convex/react";
import { createElement } from "react";
import type { DateRange } from "react-day-picker";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { useStablePaginatedQuery } from "@/hooks/useStablePaginatedQuery";
import { parseDurationToMilliseconds, withToast } from "@/lib/utils";
import type { Category, Client, Project, TimeEntry } from "../../lib/types";

const userId = import.meta.env.VITE_USER_ID as Id<"users">;

export const CELL_INPUT_CLASS =
	"w-full border-transparent bg-transparent px-4 shadow-none hover:bg-input/30 focus-visible:border focus-visible:bg-background dark:bg-transparent dark:hover:bg-input/30 dark:focus-visible:bg-input/30 truncate";

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
				className:
					"px-1 py-0.5 rounded bg-muted border border-border text-[10px] font-mono",
			},
			"\u21B5",
		),
		"save",
	);
}

export function useUpdateTimeEntryName(timeEntryId: Id<"time_entries">) {
	const update = withToast(
		useMutation(api.time_entries.update),
		"Updating name...",
		"Name updated",
		"Failed to update name",
	);
	return (name: string) => update({ id: timeEntryId, name, userId });
}

export function useUpdateTimeEntryClient(timeEntryId: Id<"time_entries">) {
	const update = withToast(
		useMutation(api.time_entries.updateClient),
		"Updating client...",
		"Client updated",
		"Failed to update client",
	);
	return (clientId?: Id<"clients">, newClientName?: string) =>
		update({ timeEntryId, clientId, newClientName, userId });
}

export function useUpdateTimeEntryProject(timeEntryId: Id<"time_entries">) {
	const update = withToast(
		useMutation(api.time_entries.updateProject),
		"Updating project...",
		"Project updated",
		"Failed to update project",
	);
	return (projectId?: Id<"projects">, newProjectName?: string) =>
		update({ timeEntryId, projectId, newProjectName, userId });
}

export function useUpdateTimeEntryCategory(timeEntryId: Id<"time_entries">) {
	const update = withToast(
		useMutation(api.time_entries.updateCategory),
		"Updating category...",
		"Category updated",
		"Failed to update category",
	);
	return (categoryId?: Id<"categories">, newCategoryName?: string) =>
		update({ timeEntryId, categoryId, newCategoryName, userId });
}

export function useUpdateDuration(timeEntryId: Id<"time_entries">) {
	const update = withToast(
		useMutation(api.time_entries.update),
		"Updating duration...",
		"Duration updated",
		"Failed to update duration",
	);
	return (duration: string) =>
		update({
			id: timeEntryId,
			userId,
			duration: parseDurationToMilliseconds(duration),
		});
}

export function useUpdateStartEndTime(timeEntryId: Id<"time_entries">) {
	const update = withToast(
		useMutation(api.time_entries.update),
		"Updating start/end time...",
		"Start/end time updated",
		"Failed to update start/end time",
	);
	return (startDate: number, endDate: number) =>
		update({ id: timeEntryId, userId, startDate, endDate });
}

export function useDeleteTimeEntry(timeEntryId: Id<"time_entries">) {
	const remove = withToast(
		useMutation(api.time_entries.deleteOne),
		"Deleting time entry...",
		"Time entry deleted",
		"Failed to delete time entry",
	);
	return () => remove({ id: timeEntryId, userId });
}

export function useStartStopTimeEntry(timeEntryId: Id<"time_entries">) {
	const start = withToast(
		useMutation(api.time_entries.create),
		"Starting timer...",
		"Timer started",
		"Failed to start timer",
	);
	const stop = withToast(
		useMutation(api.time_entries.stop),
		"Stopping timer...",
		"Timer stopped",
		"Failed to stop timer",
	);

	return {
		startTimer: () => start({ userId, name: "", timeEntryId }),
		stopTimer: () => stop({ id: timeEntryId, userId }),
	};
}

export function useUpdateTimeEntryDetails(timeEntryId: Id<"time_entries">) {
	const update = withToast(
		useMutation(api.time_entries.update),
		"Updating notes...",
		"Notes updated",
		"Failed to update notes",
	);
	return (fields: { notes?: string }) =>
		update({ id: timeEntryId, userId, ...fields });
}

export function useDuplicateTimeEntry(timeEntryId: Id<"time_entries">) {
	const create = withToast(
		useMutation(api.time_entries.create),
		"Duplicating entry...",
		"Entry duplicated",
		"Failed to duplicate entry",
	);
	return () => create({ userId, name: "", timeEntryId });
}

export function useBulkDeleteTimeEntries() {
	const remove = withToast(
		useMutation(api.time_entries.bulkDelete),
		"Deleting entries...",
		"Entries deleted",
		"Failed to delete entries",
	);
	return (ids: Id<"time_entries">[]) => remove({ ids, userId });
}

export function useBulkUpdateTimeEntries() {
	const update = withToast(
		useMutation(api.time_entries.bulkUpdate),
		"Updating entries...",
		"Entries updated",
		"Failed to update entries",
	);
	return (
		ids: Id<"time_entries">[],
		fields: {
			clientId?: Id<"clients">;
			projectId?: Id<"projects">;
			categoryId?: Id<"categories">;
		},
	) => update({ ids, userId, ...fields });
}

export function useTimeEntries(
	searchValue: string,
	filterByClients: Client[],
	filterByProjects: Project[],
	filterByCategories: Category[],
	filterByTimeRange?: DateRange,
) {
	return useStablePaginatedQuery<
		TimeEntry,
		typeof api.time_entries.searchTimeEntries
	>(
		api.time_entries.searchTimeEntries,
		{
			userId,
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
