import { FileSearch, FlagTriangleRight, type LucideProps, UserSearch } from "lucide-react";

import { api } from "@/../convex/_generated/api";
import type { SelectableItem } from "@/components/searchable-combobox";
import { SearchableCombobox } from "@/components/searchable-combobox";
import { CustomSelectTrigger } from "@/components/time-entries-table/custom-select-trigger";
import type { Category, Client, Project } from "@/lib/types";

function createFilterTrigger(icon: React.ComponentType<LucideProps>) {
	return function FilterTrigger<T extends SelectableItem>(props: {
		id?: string;
		className?: string;
		value?: T | T[];
		placeholder?: string;
	}) {
		return <CustomSelectTrigger icon={icon} value={props.value} placeholder={props.placeholder} />;
	};
}

const ClientTrigger = createFilterTrigger(UserSearch);
const ProjectTrigger = createFilterTrigger(FileSearch);
const CategoryTrigger = createFilterTrigger(FlagTriangleRight);

type EntityFilterProps<T extends SelectableItem> = {
	value: T[];
	onSelect: (items: T[]) => void;
	placeholder?: string;
};

export function ClientFilter(props: EntityFilterProps<Client>) {
	return (
		<SearchableCombobox
			type="multiple"
			apiQuery={api.clients.searchByName}
			comboboxTrigger={ClientTrigger}
			value={props.value}
			onItemSelectChange={props.onSelect}
			placeholder={props.placeholder}
		/>
	);
}

export function ProjectFilter(props: EntityFilterProps<Project>) {
	return (
		<SearchableCombobox
			type="multiple"
			apiQuery={api.projects.searchByName}
			comboboxTrigger={ProjectTrigger}
			value={props.value}
			onItemSelectChange={props.onSelect}
			placeholder={props.placeholder}
		/>
	);
}

export function CategoryFilter(props: EntityFilterProps<Category>) {
	return (
		<SearchableCombobox
			type="multiple"
			apiQuery={api.categories.searchByName}
			comboboxTrigger={CategoryTrigger}
			value={props.value}
			onItemSelectChange={props.onSelect}
			placeholder={props.placeholder}
		/>
	);
}
