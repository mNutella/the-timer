import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { SearchableCombobox } from "@/components/searchable-combobox";

import type { Client } from "../../lib/types";
import { CELL_INPUT_CLASS, useUpdateTimeEntryClient } from "./hooks";

export function ClientCell({
	timeEntryId,
	client,
}: {
	timeEntryId: Id<"time_entries">;
	client: Client | null;
}) {
	const updateClient = useUpdateTimeEntryClient(timeEntryId);

	return (
		<SearchableCombobox
			id={`${timeEntryId}-client`}
			value={client ?? undefined}
			className={CELL_INPUT_CLASS}
			apiQuery={api.clients.searchByName}
			onValueChange={(client) => updateClient(client?._id)}
			onSelect={(name) => updateClient(undefined, name)}
		/>
	);
}
