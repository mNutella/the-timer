import { toast } from "sonner";

import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { parseDurationToMilliseconds } from "@/lib/utils";

function withToast<T extends any[], R>(
	mutation: (...args: T) => Promise<R>,
	loadingMessage: string,
	successMessage: string = "Done",
	errorMessage: string = "Error",
) {
	return (...args: T) => {
		toast.promise(mutation(...args), {
			loading: loadingMessage,
			success: successMessage,
			error: errorMessage,
		});
	};
}

export function useUpdateActivityName(activityId: Id<"activities">) {
	const updateNameMutation = useMutation(api.activities.updateName);

	const updateName = (name: string) => {
		const wrappedMutation = withToast(
			updateNameMutation,
			"Updating name...",
			"Name updated",
			"Failed to update name",
		);

		wrappedMutation({
			activityId,
			name,
			userId: import.meta.env.VITE_USER_ID as Id<"users">,
		});
	};

	return updateName;
}

export function useUpdateActivityClient(activityId: Id<"activities">) {
	const updateClientMutation = useMutation(api.activities.updateClient);

	const updateClient = (clientId?: Id<"clients">, clientName?: string) => {
		const wrappedMutation = withToast(
			updateClientMutation,
			"Updating client...",
			"Client updated",
			"Failed to update client",
		);

		wrappedMutation({
			activityId,
			clientId,
			clientName,
			userId: import.meta.env.VITE_USER_ID as Id<"users">,
		});
	};

	return updateClient;
}

export function useUpdateActivityProject(activityId: Id<"activities">) {
	const updateProjectMutation = useMutation(api.activities.updateProject);

	const updateProject = (projectId?: Id<"projects">, projectName?: string) => {
		const wrappedMutation = withToast(
			updateProjectMutation,
			"Updating project...",
			"Project updated",
			"Failed to update project",
		);

		wrappedMutation({
			activityId,
			projectId,
			projectName,
			userId: import.meta.env.VITE_USER_ID as Id<"users">,
		});
	};

	return updateProject;
}

export function useUpdateActivityCategory(activityId: Id<"activities">) {
	const updateCategoryMutation = useMutation(api.activities.updateCategory);

	const updateCategory = (
		categoryId?: Id<"categories">,
		categoryName?: string,
	) => {
		const wrappedMutation = withToast(
			updateCategoryMutation,
			"Updating category...",
			"Category updated",
			"Failed to update category",
		);

		wrappedMutation({
			activityId,
			categoryId,
			categoryName,
			userId: import.meta.env.VITE_USER_ID as Id<"users">,
		});
	};

	return updateCategory;
}

export function useUpdateDuration(timeEntryId: Id<"time_entries">) {
	const updateDurationMutation = useMutation(api.time_entries.updateDuration);

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
	const updateStartEndTimeMutation = useMutation(
		api.time_entries.updateStartEndTime,
	);

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

export function useStartStopTimeEntry(
	activityId: Id<"activities">,
	timeEntryId: Id<"time_entries">,
) {
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
			activityId,
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
