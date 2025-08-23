import { IconFlagSearch } from "@tabler/icons-react";

import { api } from "@/../convex/_generated/api";

import { SearchableCombobox } from "@/components/searchable-combobox";
import type { Category } from "./types";
import { CustomSelectTrigger } from "./custom-select-trigger";

function CategoryFilterTrigger({
	value,
	placeholder,
}: {
	value?: Category;
	placeholder?: string;
}) {
	return (
		<CustomSelectTrigger
			icon={IconFlagSearch}
			value={value}
			placeholder={placeholder}
		/>
	);
}

export function CategoryFilter({
	value,
	onSelect,
	placeholder,
}: {
	value?: Category;
	onSelect: (category?: Category) => void;
	placeholder?: string;
}) {
	const id = "category-filter";
	return (
		<SearchableCombobox
			id={id}
			apiQuery={api.categories.searchByName}
			comboboxTrigger={CategoryFilterTrigger}
			value={value}
			onValueChange={onSelect}
			placeholder={placeholder}
		/>
	);
}
