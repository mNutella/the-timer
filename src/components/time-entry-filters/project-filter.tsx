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
	value: Project[];
	onSelect: (projects: Project[]) => void;
	placeholder?: string;
}) {
	const id = "project-filter";
	return (
		<SearchableCombobox
			id={id}
			type="multiple"
			apiQuery={api.projects.searchByName}
			comboboxTrigger={ProjectFilterTrigger}
			value={value}
			onItemSelectChange={onSelect}
			placeholder={placeholder}
		/>
	);
}
