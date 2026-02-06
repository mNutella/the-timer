import * as React from "react";
import type { Client, Project, Category } from "@/lib/types";
import type { DateRange } from "react-day-picker";

export function useFilters() {
	const [searchValue, setSearchValue] = React.useState("");
	const [filterByClient, setFilterByClient] = React.useState<
		Client | undefined
	>(undefined);
	const [filterByProject, setFilterByProject] = React.useState<
		Project | undefined
	>(undefined);
	const [filterByCategory, setFilterByCategory] = React.useState<
		Category | undefined
	>(undefined);
	const [filterByTimeRange, setFilterByTimeRange] = React.useState<
		DateRange | undefined
	>(undefined);

	return {
		searchValue,
		setSearchValue,
		filterByClient,
		setFilterByClient,
		filterByProject,
		setFilterByProject,
		filterByCategory,
		setFilterByCategory,
		filterByTimeRange,
		setFilterByTimeRange,
	};
}
