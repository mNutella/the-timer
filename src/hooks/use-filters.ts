import { useEffect, useState } from "react";
import type { DateRange } from "react-day-picker";

import type { Category, Client, Project } from "@/lib/types";

function useDebouncedValue<T>(value: T, delayMs: number): T {
	const [debounced, setDebounced] = useState(value);

	useEffect(() => {
		const timer = setTimeout(() => setDebounced(value), delayMs);
		return () => clearTimeout(timer);
	}, [value, delayMs]);

	return debounced;
}

export function useFilters() {
	const [searchValue, setSearchValue] = useState("");
	const debouncedSearchValue = useDebouncedValue(searchValue, 300);
	const [filterByClients, setFilterByClients] = useState<Client[]>([]);
	const [filterByProjects, setFilterByProjects] = useState<Project[]>([]);
	const [filterByCategories, setFilterByCategories] = useState<Category[]>([]);
	const [filterByTimeRange, setFilterByTimeRange] = useState<DateRange | undefined>(undefined);

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
