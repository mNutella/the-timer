import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { SearchableCombobox } from "@/components/searchable-combobox";
import { useUpdateActivityClient } from "./hooks";
import type { Client } from "./types";

export function ClientCell({
	timeEntryId,
	activityId,
	client,
}: {
	timeEntryId: Id<"time_entries">;
	activityId: Id<"activities">;
	client: Client | null;
}) {
	const updateClient = useUpdateActivityClient(activityId);

	return (
		<SearchableCombobox
			id={`${timeEntryId}-client`}
			value={client ?? undefined}
			className="w-fit border-transparent bg-transparent px-4 shadow-none hover:bg-input/30 focus-visible:border focus-visible:bg-background dark:bg-transparent dark:hover:bg-input/30 dark:focus-visible:bg-input/30"
			apiQuery={api.clients.searchByName}
			onValueChange={(client) => {
				updateClient(client?._id);
			}}
			onCreate={(name) => {
				updateClient(undefined, name);
			}}
		/>
	);
}
