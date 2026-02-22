import * as React from "react";
import type { DateRange } from "react-day-picker";
import type { Category, Client, Project } from "@/lib/types";

function useDebouncedValue<T>(value: T, delayMs: number): T {
	const [debounced, setDebounced] = React.useState(value);

	React.useEffect(() => {
		const timer = setTimeout(() => setDebounced(value), delayMs);
		return () => clearTimeout(timer);
	}, [value, delayMs]);

	return debounced;
}

export function useFilters() {
	const [searchValue, setSearchValue] = React.useState("");
	const debouncedSearchValue = useDebouncedValue(searchValue, 300);
	const [filterByClients, setFilterByClients] = React.useState<Client[]>([]);
	const [filterByProjects, setFilterByProjects] = React.useState<Project[]>([]);
	const [filterByCategories, setFilterByCategories] = React.useState<
		Category[]
	>([]);
	const [filterByTimeRange, setFilterByTimeRange] = React.useState<
		DateRange | undefined
	>(undefined);

	return {
		searchValue,
		debouncedSearchValue,
		setSearchValue,
		filterByClients,
		setFilterByClients,
		filterByProjects,
		setFilterByProjects,
		filterByCategories,
		setFilterByCategories,
		filterByTimeRange,
		setFilterByTimeRange,
	};
}
