import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex-helpers/react/cache";
import { useMutation } from "convex/react";
import { Users } from "lucide-react";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { toast } from "sonner";

import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { EntityManagementTable } from "@/components/entity-management-table";
import { Input } from "@/components/ui/input";
import { optimisticDeleteClient, optimisticRenameClient } from "@/lib/optimistic-updates";
import { withToast } from "@/lib/utils";

export const Route = createFileRoute("/(app)/clients")({
	component: ClientsPage,
});

function RateCell({ clientId, currentRate }: { clientId: Id<"clients">; currentRate?: number }) {
	const updateClient = useMutation(api.clients.update);
	const [editing, setEditing] = useState(false);
	const [value, setValue] = useState(currentRate ? (currentRate / 100).toString() : "");

	if (editing) {
		return (
			<Input
				autoFocus
				type="number"
				min="0"
				step="0.01"
				placeholder="0.00"
				value={value}
				onChange={(e) => setValue(e.target.value)}
				onBlur={() => {
					setEditing(false);
					const parsed = Number.parseFloat(value);
					if (value === "" || value === "0") {
						updateClient({ id: clientId, clearHourlyRate: true }).catch(() =>
							toast.error("Failed to update rate"),
						);
						return;
					}
					if (Number.isNaN(parsed) || parsed < 0) return;
					updateClient({ id: clientId, hourly_rate_cents: Math.round(parsed * 100) }).catch(() =>
						toast.error("Failed to update rate"),
					);
				}}
				onKeyDown={(e) => {
					if (e.key === "Enter") e.currentTarget.blur();
					if (e.key === "Escape") setEditing(false);
				}}
				className="h-7 w-24 text-right"
			/>
		);
	}

	return (
		<button
			type="button"
			onClick={() => {
				setValue(currentRate ? (currentRate / 100).toString() : "");
				setEditing(true);
			}}
			className="cursor-pointer text-sm text-muted-foreground hover:text-foreground hover:underline"
		>
			{currentRate ? `$${(currentRate / 100).toFixed(2)}/hr` : "—"}
		</button>
	);
}

function ClientsPage() {
	const [searchValue, setSearchValue] = useState("");
	const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

	const clients = useQuery(api.clients.list, {
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
	const deleteClient = useMutation(api.clients.deleteOne).withOptimisticUpdate(
		optimisticDeleteClient,
	);

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
					render: (client) => <span className="text-muted-foreground">{client.projectCount}</span>,
				},
				{
					header: "Rate",
					className: "w-36",
					render: (client) => (
						<RateCell
							clientId={client._id as Id<"clients">}
							currentRate={client.hourly_rate_cents}
						/>
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
				)({ name })
			}
			onUpdate={(id, name) =>
				updateClient({ id: id as Id<"clients">, name }).catch(() =>
					toast.error("Failed to update client"),
				)
			}
			onDelete={(id) =>
				deleteClient({ id: id as Id<"clients"> }).catch(() =>
					toast.error("Failed to delete client"),
				)
			}
		/>
	);
}
