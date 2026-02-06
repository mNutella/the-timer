import { IconReportSearch } from "@tabler/icons-react";

import { api } from "@/../convex/_generated/api";

import { SearchableCombobox } from "@/components/searchable-combobox";
import type { Project } from "../../lib/types";
import { CustomSelectTrigger } from "../time-entries-table/custom-select-trigger";

function ProjectFilterTrigger({
	value,
	placeholder,
}: {
	value?: Project | Project[];
	placeholder?: string;
}) {
	const singleValue = Array.isArray(value) ? value[0] : value;
	return (
		<CustomSelectTrigger
			icon={IconReportSearch}
			value={singleValue}
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
