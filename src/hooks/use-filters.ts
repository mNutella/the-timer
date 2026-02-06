import * as React from "react";
import type { DateRange } from "react-day-picker";
import type { Category, Client, Project } from "@/lib/types";

export function useFilters() {
	const [searchValue, setSearchValue] = React.useState("");
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
