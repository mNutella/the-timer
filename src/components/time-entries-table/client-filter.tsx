import { IconUserSearch } from "@tabler/icons-react";

import { api } from "@/../convex/_generated/api";
import { SearchableCombobox } from "@/components/searchable-combobox";
import type { Client } from "./types";
import { CustomSelectTrigger } from "./custom-select-trigger";

function ClientFilterTrigger({
	value,
	placeholder,
}: {
	value?: Client;
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
	value?: Client;
	onSelect: (client?: Client) => void;
	placeholder?: string;
}) {
	const id = "client-filter";
	return (
		<SearchableCombobox
			id={id}
			apiQuery={api.clients.searchByName}
			comboboxTrigger={ClientFilterTrigger}
			value={value}
			onValueChange={onSelect}
			placeholder={placeholder}
		/>
	);
}
