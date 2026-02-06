import { IconFlagSearch } from "@tabler/icons-react";

import { api } from "@/../convex/_generated/api";
import { SearchableCombobox } from "@/components/searchable-combobox";
import { CustomSelectTrigger } from "@/components/time-entries-table/custom-select-trigger";
import type { Category } from "@/lib/types";

function CategoryFilterTrigger({
	value,
	placeholder,
}: {
	value?: Category | Category[];
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
	value: Category[];
	onSelect: (categories: Category[]) => void;
	placeholder?: string;
}) {
	const id = "category-filter";
	return (
		<SearchableCombobox
			id={id}
			type="multiple"
			apiQuery={api.categories.searchByName}
			comboboxTrigger={CategoryFilterTrigger}
			value={value}
			onItemSelectChange={onSelect}
			placeholder={placeholder}
		/>
	);
}
