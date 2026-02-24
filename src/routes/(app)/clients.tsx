import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { useQuery } from "convex-helpers/react/cache";
import { Users } from "lucide-react";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { EntityManagementTable } from "@/components/entity-management-table";
import {
	optimisticDeleteClient,
	optimisticRenameClient,
} from "@/lib/optimistic-updates";
import { withToast } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/(app)/clients")({
	component: ClientsPage,
});

function ClientsPage() {
	const userId = import.meta.env.VITE_USER_ID as Id<"users">;
	const [searchValue, setSearchValue] = useState("");
	const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

	const clients = useQuery(api.clients.list, {
		userId,
		dateRange:
			dateRange?.from && dateRange?.to
				? {
						startDate: dateRange.from.getTime(),
						endDate: dateRange.to.getTime(),
					}
				: undefined,
	});
	const createClient = useMutation(api.clients.create);
	const updateClient = useMutation(api.clients.update).withOptimisticUpdate(optimisticRenameClient);
	const deleteClient = useMutation(api.clients.deleteOne).withOptimisticUpdate(optimisticDeleteClient);

	return (
		<EntityManagementTable
			icon={Users}
			entityLabel="clients"
			entityLabelSingular="client"
			data={clients}
			searchValue={searchValue}
			onSearchChange={setSearchValue}
			dateRange={dateRange}
			onDateRangeChange={setDateRange}
			extraColumns={[
				{
					header: "Projects",
					className: "w-32",
					render: (client) => (
						<span className="text-muted-foreground">{client.projectCount}</span>
					),
				},
			]}
			deleteDescription={(name) =>
				`Are you sure you want to delete "${name}"? Time entries and projects linked to this client will lose their client reference. This action cannot be undone.`
			}
			onCreate={(name) =>
				withToast(
					createClient,
					"Creating client...",
					"Client created",
					"Failed to create client",
				)({ name, userId })
			}
			onUpdate={(id, name) =>
				updateClient({ id: id as Id<"clients">, userId, name })
					.catch(() => toast.error("Failed to update client"))
			}
			onDelete={(id) =>
				deleteClient({ id: id as Id<"clients">, userId })
					.catch(() => toast.error("Failed to delete client"))
			}
		/>
	);
}
