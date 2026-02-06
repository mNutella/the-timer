import { useMutation } from "convex/react";
import type { DateRange } from "react-day-picker";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { useStablePaginatedQuery } from "@/hooks/useStablePaginatedQuery";
import { parseDurationToMilliseconds, withToast } from "@/lib/utils";
import type { Category, Client, Project, TimeEntry } from "../../lib/types";

export function useUpdateTimeEntryName(timeEntryId: Id<"time_entries">) {
	const updateNameMutation = useMutation(api.time_entries.update);

	const updateName = (name: string) => {
		const wrappedMutation = withToast(
			updateNameMutation,
			"Updating name...",
			"Name updated",
			"Failed to update name",
		);

		wrappedMutation({
			id: timeEntryId,
			name,
			userId: import.meta.env.VITE_USER_ID as Id<"users">,
		});
	};

	return updateName;
}

export function useUpdateTimeEntryClient(timeEntryId: Id<"time_entries">) {
	const updateClientMutation = useMutation(api.time_entries.updateClient);

	const updateClient = (clientId?: Id<"clients">, newClientName?: string) => {
		const wrappedMutation = withToast(
			updateClientMutation,
			"Updating client...",
			"Client updated",
			"Failed to update client",
		);

		wrappedMutation({
			timeEntryId,
			clientId,
			newClientName,
			userId: import.meta.env.VITE_USER_ID as Id<"users">,
		});
	};

	return updateClient;
}

export function useUpdateTimeEntryProject(timeEntryId: Id<"time_entries">) {
	const updateProjectMutation = useMutation(api.time_entries.updateProject);

	const updateProject = (
		projectId?: Id<"projects">,
		newProjectName?: string,
	) => {
		const wrappedMutation = withToast(
			updateProjectMutation,
			"Updating project...",
			"Project updated",
			"Failed to update project",
		);

		wrappedMutation({
			timeEntryId,
			projectId,
			newProjectName,
			userId: import.meta.env.VITE_USER_ID as Id<"users">,
		});
	};

	return updateProject;
}

export function useUpdateTimeEntryCategory(timeEntryId: Id<"time_entries">) {
	const updateCategoryMutation = useMutation(api.time_entries.updateCategory);

	const updateCategory = (
		categoryId?: Id<"categories">,
		newCategoryName?: string,
	) => {
		const wrappedMutation = withToast(
			updateCategoryMutation,
			"Updating category...",
			"Category updated",
			"Failed to update category",
		);

		wrappedMutation({
			timeEntryId,
			categoryId,
			newCategoryName,
			userId: import.meta.env.VITE_USER_ID as Id<"users">,
		});
	};

	return updateCategory;
}

export function useUpdateDuration(timeEntryId: Id<"time_entries">) {
	const updateDurationMutation = useMutation(api.time_entries.update);

	const updateDuration = (duration: string) => {
		const wrappedMutation = withToast(
			updateDurationMutation,
			"Updating duration...",
			"Duration updated",
			"Failed to update duration",
		);

		wrappedMutation({
			id: timeEntryId,
			userId: import.meta.env.VITE_USER_ID as Id<"users">,
			duration: parseDurationToMilliseconds(duration),
		});
	};

	return updateDuration;
}

export function useUpdateStartEndTime(timeEntryId: Id<"time_entries">) {
	const updateStartEndTimeMutation = useMutation(api.time_entries.update);

	const updateStartEndTime = (startDate: number, endDate: number) => {
		const wrappedMutation = withToast(
			updateStartEndTimeMutation,
			"Updating start/end time...",
			"Start/end time updated",
			"Failed to update start/end time",
		);

		wrappedMutation({
			id: timeEntryId,
			userId: import.meta.env.VITE_USER_ID as Id<"users">,
			startDate,
			endDate,
		});
	};

	return updateStartEndTime;
}

export function useDeleteTimeEntry(timeEntryId: Id<"time_entries">) {
	const deleteTimeEntryMutation = useMutation(api.time_entries.deleteOne);

	const deleteTimeEntry = () => {
		const wrappedMutation = withToast(
			deleteTimeEntryMutation,
			"Deleting time entry...",
			"Time entry deleted",
			"Failed to delete time entry",
		);

		wrappedMutation({
			id: timeEntryId,
			userId: import.meta.env.VITE_USER_ID as Id<"users">,
		});
	};

	return deleteTimeEntry;
}

export function useStartStopTimeEntry(timeEntryId: Id<"time_entries">) {
	const createTimerMutation = useMutation(api.time_entries.create);
	const stopTimerMutation = useMutation(api.time_entries.stop);

	const startTimer = () => {
		const wrappedMutation = withToast(
			createTimerMutation,
			"Starting timer...",
			"Timer started",
			"Failed to start timer",
		);

		wrappedMutation({
			userId: import.meta.env.VITE_USER_ID as Id<"users">,
			name: "",
			timeEntryId,
		});
	};

	const stopTimer = () => {
		const wrappedMutation = withToast(
			stopTimerMutation,
			"Stopping timer...",
			"Timer stopped",
			"Failed to stop timer",
		);

		wrappedMutation({
			id: timeEntryId,
			userId: import.meta.env.VITE_USER_ID as Id<"users">,
		});
	};

	return { startTimer, stopTimer };
}

export function useTimeEntries(
	searchValue: string,
	filterByClients: Client[],
	filterByProjects: Project[],
	filterByCategories: Category[],
	filterByTimeRange?: DateRange,
) {
	const { results, loadMore, isLoading, status } = useStablePaginatedQuery<
		TimeEntry,
		typeof api.time_entries.searchTimeEntries
	>(
		api.time_entries.searchTimeEntries,
		{
			userId: import.meta.env.VITE_USER_ID as Id<"users">,
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
		},
		{ initialNumItems: 10 },
	);

	return { results, loadMore, isLoading, status };
}
