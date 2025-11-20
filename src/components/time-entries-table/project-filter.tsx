import { IconReportSearch } from "@tabler/icons-react";

import { api } from "@/../convex/_generated/api";

import { SearchableCombobox } from "@/components/searchable-combobox";
import type { Project } from "./types";
import { CustomSelectTrigger } from "./custom-select-trigger";

function ProjectFilterTrigger({
	value,
	placeholder,
}: {
	value?: Project;
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
	onSelect: (project?: Project) => void;
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
