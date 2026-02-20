import { IconPencil, IconPlus, IconTrash } from "@tabler/icons-react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { useQuery } from "convex-helpers/react/cache";
import { useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import {
	TimeRangeFilter,
	TimerEntrySearch,
} from "@/components/time-entry-filters";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { formatDuration, withToast } from "@/lib/utils";

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
	const updateClient = useMutation(api.clients.update);
	const deleteClient = useMutation(api.clients.deleteOne);

	const [editingId, setEditingId] = useState<Id<"clients"> | null>(null);
	const [editValue, setEditValue] = useState("");
	const [newName, setNewName] = useState("");
	const [isAdding, setIsAdding] = useState(false);
	const [deleteTarget, setDeleteTarget] = useState<{
		id: Id<"clients">;
		name: string;
	} | null>(null);

	const filteredClients = useMemo(() => {
		if (!clients) return undefined;
		if (!searchValue.trim()) return clients;
		const query = searchValue.toLowerCase();
		return clients.filter((c) => c.name.toLowerCase().includes(query));
	}, [clients, searchValue]);

	const handleCreate = () => {
		if (!newName.trim()) return;
		withToast(
			createClient,
			"Creating client...",
			"Client created",
			"Failed to create client",
		)({ name: newName.trim(), userId });
		setNewName("");
		setIsAdding(false);
	};

	const handleStartEdit = (id: Id<"clients">, name: string) => {
		setEditingId(id);
		setEditValue(name);
	};

	const handleSaveEdit = () => {
		if (!editingId || !editValue.trim()) return;
		withToast(
			updateClient,
			"Updating client...",
			"Client updated",
			"Failed to update client",
		)({ id: editingId, userId, name: editValue.trim() });
		setEditingId(null);
		setEditValue("");
	};

	const handleDelete = () => {
		if (!deleteTarget) return;
		withToast(
			deleteClient,
			"Deleting client...",
			"Client deleted",
			"Failed to delete client",
		)({ id: deleteTarget.id, userId });
		setDeleteTarget(null);
	};

	return (
		<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
			<div className="px-4 lg:px-6">
				<div className="flex items-center justify-between mb-4">
					<div className="flex items-center gap-2">
						<TimerEntrySearch value={searchValue} onChange={setSearchValue} />
						<TimeRangeFilter value={dateRange} onChange={setDateRange} />
					</div>
					{isAdding ? (
						<div className="flex items-center gap-2">
							<Input
								autoFocus
								placeholder="Client name"
								value={newName}
								onChange={(e) => setNewName(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") handleCreate();
									if (e.key === "Escape") {
										setIsAdding(false);
										setNewName("");
									}
								}}
								className="h-8 w-48"
							/>
							<Button size="sm" variant="default" onClick={handleCreate}>
								Add
							</Button>
							<Button
								size="sm"
								variant="ghost"
								onClick={() => {
									setIsAdding(false);
									setNewName("");
								}}
							>
								Cancel
							</Button>
						</div>
					) : (
						<Button
							size="sm"
							variant="outline"
							onClick={() => setIsAdding(true)}
						>
							<IconPlus className="size-4" />
							Add Client
						</Button>
					)}
				</div>

				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Name</TableHead>
							<TableHead className="w-32">Projects</TableHead>
							<TableHead className="w-36">Total Hours</TableHead>
							<TableHead className="w-24 text-right">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{filteredClients?.length === 0 && (
							<TableRow>
								<TableCell
									colSpan={4}
									className="text-center text-muted-foreground py-8"
								>
									{clients?.length === 0
										? "No clients yet. Add one to get started."
										: "No clients match your search."}
								</TableCell>
							</TableRow>
						)}
						{filteredClients?.map((client) => (
							<TableRow key={client._id}>
								<TableCell>
									{editingId === client._id ? (
										<Input
											autoFocus
											value={editValue}
											onChange={(e) => setEditValue(e.target.value)}
											onKeyDown={(e) => {
												if (e.key === "Enter") handleSaveEdit();
												if (e.key === "Escape") {
													setEditingId(null);
													setEditValue("");
												}
											}}
											onBlur={handleSaveEdit}
											className="h-7 w-48"
										/>
									) : (
										<span className="font-medium">{client.name}</span>
									)}
								</TableCell>
								<TableCell className="text-muted-foreground">
									{client.projectCount}
								</TableCell>
								<TableCell className="text-muted-foreground tabular-nums">
									{formatDuration(client.totalDuration)}
								</TableCell>
								<TableCell className="text-right">
									<div className="flex items-center justify-end gap-1">
										<Button
											size="icon"
											variant="ghost"
											className="size-7"
											onClick={() => handleStartEdit(client._id, client.name)}
										>
											<IconPencil className="size-3.5" />
										</Button>
										<Button
											size="icon"
											variant="ghost"
											className="size-7 text-destructive hover:text-destructive"
											onClick={() =>
												setDeleteTarget({
													id: client._id,
													name: client.name,
												})
											}
										>
											<IconTrash className="size-3.5" />
										</Button>
									</div>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>

			<AlertDialog
				open={!!deleteTarget}
				onOpenChange={(open) => !open && setDeleteTarget(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete client</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete "{deleteTarget?.name}"? Time
							entries and projects linked to this client will lose their client
							reference. This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDelete}
							className="bg-destructive text-white hover:bg-destructive/90"
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
