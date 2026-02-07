import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { SearchableCombobox } from "@/components/searchable-combobox";
import type { Category } from "../../lib/types";
import { CELL_INPUT_CLASS, useUpdateTimeEntryCategory } from "./hooks";

export function CategoryCell({
	timeEntryId,
	category,
}: {
	timeEntryId: Id<"time_entries">;
	category: Category | null;
}) {
	const updateCategory = useUpdateTimeEntryCategory(timeEntryId);

	return (
		<SearchableCombobox
			id={`${timeEntryId}-category`}
			value={category ?? undefined}
			className={CELL_INPUT_CLASS}
			apiQuery={api.categories.searchByName}
			onValueChange={(category) => updateCategory(category?._id)}
			onSelect={(name) => updateCategory(undefined, name)}
		/>
	);
}
