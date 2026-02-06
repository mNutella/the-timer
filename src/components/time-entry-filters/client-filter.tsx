import { IconUserSearch } from "@tabler/icons-react";

import { api } from "@/../convex/_generated/api";
import { SearchableCombobox } from "@/components/searchable-combobox";
import { CustomSelectTrigger } from "@/components/time-entries-table/custom-select-trigger";
import type { Client } from "@/lib/types";

function ClientFilterTrigger({
	value,
	placeholder,
}: {
	value?: Client | Client[];
	placeholder?: string;
}) {
	return (
		<CustomSelectTrigger
			icon={IconUserSearch}
			value={value}
			placeholder={placeholder}
		/>
	);
}

export function ClientFilter({
	value,
	onSelect,
	placeholder,
}: {
	value: Client[];
	onSelect: (clients: Client[]) => void;
	placeholder?: string;
}) {
	const id = "client-filter";
	return (
		<SearchableCombobox
			id={id}
			type="multiple"
			apiQuery={api.clients.searchByName}
			comboboxTrigger={ClientFilterTrigger}
			value={value}
			onItemSelectChange={onSelect}
			placeholder={placeholder}
		/>
	);
}
