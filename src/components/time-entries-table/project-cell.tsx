import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { SearchableCombobox } from "@/components/searchable-combobox";
import type { Project } from "../../lib/types";
import { CELL_INPUT_CLASS, useUpdateTimeEntryProject } from "./hooks";

export function ProjectCell({
	timeEntryId,
	clientId,
	project,
}: {
	timeEntryId: Id<"time_entries">;
	clientId?: Id<"clients">;
	project?: Project | null;
}) {
	const updateProject = useUpdateTimeEntryProject(timeEntryId);

	return (
		<SearchableCombobox
			id={`${timeEntryId}-project`}
			value={project ?? undefined}
			className={CELL_INPUT_CLASS}
			apiQuery={api.projects.searchByName}
			queryArgs={{
				clientId,
				query: "",
				paginationOpts: { numItems: 10, cursor: null },
			}}
			onValueChange={(project) => updateProject(project?._id)}
			onSelect={(name) => updateProject(undefined, name)}
		/>
	);
}
