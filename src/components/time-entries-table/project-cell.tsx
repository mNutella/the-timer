import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { SearchableCombobox } from "@/components/searchable-combobox";
import { useUpdateActivityProject } from "./hooks";
import type { Project } from "./types";

export function ProjectCell({
	timeEntryId,
	activityId,
	clientId,
	project,
}: {
	timeEntryId: Id<"time_entries">;
	activityId: Id<"activities">;
	clientId?: Id<"clients">;
	project?: Project;
}) {
	const updateProject = useUpdateActivityProject(activityId);

	return (
		<SearchableCombobox
			id={`${timeEntryId}-project`}
			value={project ?? undefined}
			className="w-fit border-transparent bg-transparent px-4 shadow-none hover:bg-input/30 focus-visible:border focus-visible:bg-background dark:bg-transparent dark:hover:bg-input/30 dark:focus-visible:bg-input/30"
			apiQuery={api.projects.searchByName}
			queryArgs={{
				userId: import.meta.env.VITE_USER_ID as Id<"users">,
				clientId,
				query: "",
				paginationOpts: {
					numItems: 10,
					cursor: null,
				},
			}}
			onValueChange={(project) => {
				updateProject(project?._id);
			}}
			onCreate={(name) => {
				updateProject(undefined, name);
			}}
		/>
	);
}
