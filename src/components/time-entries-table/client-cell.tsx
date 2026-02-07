import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { SearchableCombobox } from "@/components/searchable-combobox";
import type { Client } from "../../lib/types";
import { useUpdateTimeEntryClient } from "./hooks";

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
			className="w-fit border-transparent bg-transparent px-4 shadow-none hover:bg-input/30 focus-visible:border focus-visible:bg-background dark:bg-transparent dark:hover:bg-input/30 dark:focus-visible:bg-input/30"
			apiQuery={api.clients.searchByName}
			onValueChange={(client) => {
				updateClient(client?._id);
			}}
			onSelect={(name) => {
				updateClient(undefined, name);
			}}
		/>
	);
}
