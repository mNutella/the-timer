import { IconReportSearch, IconUserSearch } from "@tabler/icons-react";

import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";

import { SearchableCombobox } from "@/components/searchable-combobox";
import type { Client, Project } from "./types";
import { CustomSelectTrigger } from "./custom-select-trigger";

function ProjectFilterTrigger({
	value,
	placeholder,
}: {
	value?: Client;
	placeholder?: string;
}) {
	return (
		<CustomSelectTrigger
			icon={IconReportSearch}
			value={value}
			placeholder={placeholder}
		/>
	);
}

export function ProjectFilter({
	value,
	onSelect,
	placeholder,
}: {
	value?: Project;
	onSelect: (projectId: Id<"projects">) => void;
	placeholder?: string;
}) {
	const id = "project-filter";
	return (
		<SearchableCombobox
			id={id}
			apiQuery={api.projects.searchByName}
			comboboxTrigger={ProjectFilterTrigger}
			value={value}
			onValueChange={onSelect}
			placeholder={placeholder}
		/>
	);
}
