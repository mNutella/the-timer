import { IconFlagSearch } from "@tabler/icons-react";

import { api } from "@/../convex/_generated/api";
import { SearchableCombobox } from "@/components/searchable-combobox";
import type { Category } from "@/lib/types";
import { CustomSelectTrigger } from "@/components/time-entries-table/custom-select-trigger";

function CategoryFilterTrigger({
	value,
	placeholder,
}: {
	value?: Category | Category[];
	placeholder?: string;
}) {
	const singleValue = Array.isArray(value) ? value[0] : value;
	return (
		<CustomSelectTrigger
			icon={IconFlagSearch}
			value={singleValue}
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
