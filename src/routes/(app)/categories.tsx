import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { useQuery } from "convex-helpers/react/cache";
import { Tag } from "lucide-react";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { EntityManagementTable } from "@/components/entity-management-table";
import {
	optimisticDeleteCategory,
	optimisticRenameCategory,
} from "@/lib/optimistic-updates";
import { withToast } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/(app)/categories")({
	component: CategoriesPage,
});

function CategoriesPage() {
	const userId = import.meta.env.VITE_USER_ID as Id<"users">;
	const [searchValue, setSearchValue] = useState("");
	const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

	const categories = useQuery(api.categories.list, {
		userId,
		dateRange:
			dateRange?.from && dateRange?.to
				? {
						startDate: dateRange.from.getTime(),
						endDate: dateRange.to.getTime(),
					}
				: undefined,
	});
	const createCategory = useMutation(api.categories.create);
	const updateCategory = useMutation(api.categories.update).withOptimisticUpdate(optimisticRenameCategory);
	const deleteCategory = useMutation(api.categories.deleteOne).withOptimisticUpdate(optimisticDeleteCategory);

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
				)({ name, userId })
			}
			onUpdate={(id, name) =>
				updateCategory({ id: id as Id<"categories">, userId, name })
					.catch(() => toast.error("Failed to update category"))
			}
			onDelete={(id) =>
				deleteCategory({ id: id as Id<"categories">, userId })
					.catch(() => toast.error("Failed to delete category"))
			}
		/>
	);
}
