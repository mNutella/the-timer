import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex-helpers/react/cache";
import { useMutation } from "convex/react";
import { Tag } from "lucide-react";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { toast } from "sonner";

import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { EntityManagementTable } from "@/components/entity-management-table";
import { optimisticDeleteCategory, optimisticRenameCategory } from "@/lib/optimistic-updates";
import { toDateRangeTimestamps, withToast } from "@/lib/utils";

export const Route = createFileRoute("/(app)/categories")({
	component: CategoriesPage,
});

function CategoriesPage() {
	const [searchValue, setSearchValue] = useState("");
	const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

	const categories = useQuery(api.categories.list, {
		dateRange: toDateRangeTimestamps(dateRange),
	});
	const createCategory = useMutation(api.categories.create);
	const updateCategory = useMutation(api.categories.update).withOptimisticUpdate(
		optimisticRenameCategory,
	);
	const deleteCategory = useMutation(api.categories.deleteOne).withOptimisticUpdate(
		optimisticDeleteCategory,
	);

	return (
		<EntityManagementTable
			icon={Tag}
			entityLabel="categories"
			entityLabelSingular="category"
			data={categories}
			searchValue={searchValue}
			onSearchChange={setSearchValue}
			dateRange={dateRange}
			onDateRangeChange={setDateRange}
			deleteDescription={(name) =>
				`Are you sure you want to delete "${name}"? Time entries linked to this category will lose their category reference. This action cannot be undone.`
			}
			onCreate={(name) =>
				withToast(
					createCategory,
					"Creating category...",
					"Category created",
					"Failed to create category",
				)({ name })
			}
			onUpdate={(id, name) =>
				updateCategory({ id: id as Id<"categories">, name }).catch(() =>
					toast.error("Failed to update category"),
				)
			}
			onDelete={(id) =>
				deleteCategory({ id: id as Id<"categories"> }).catch(() =>
					toast.error("Failed to delete category"),
				)
			}
		/>
	);
}
