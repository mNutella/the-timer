import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { SearchableCombobox } from "@/components/searchable-combobox";
import { useUpdateActivityCategory } from "./hooks";
import type { Category } from "./types";

export function CategoryCell({
	timeEntryId,
	activityId,
	category,
}: {
	timeEntryId: Id<"time_entries">;
	activityId: Id<"activities">;
	category: Category | null;
}) {
	const updateCategory = useUpdateActivityCategory(activityId);

	return (
		<SearchableCombobox
			id={`${timeEntryId}-category`}
			value={category ?? undefined}
			className="w-fit border-transparent bg-transparent px-4 shadow-none hover:bg-input/30 focus-visible:border focus-visible:bg-background dark:bg-transparent dark:hover:bg-input/30 dark:focus-visible:bg-input/30"
			apiQuery={api.categories.searchByName}
			onValueChange={(category) => {
				updateCategory(category?._id);
			}}
			onCreate={(name) => {
				updateCategory(undefined, name);
			}}
		/>
	);
}
