import type { Id } from "convex/_generated/dataModel";
import { Copy, MoreVertical, StickyNote } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DetailsDialog } from "./details-dialog";
import { useDeleteTimeEntry, useDuplicateTimeEntry } from "./hooks";

export function ActionsCell({
	timeEntryId,
	entryName,
	notes,
}: {
	timeEntryId: Id<"time_entries">;
	entryName: string;
	notes?: string;
}) {
	const deleteTimeEntry = useDeleteTimeEntry(timeEntryId);
	const duplicateTimeEntry = useDuplicateTimeEntry(timeEntryId);
	const [detailsOpen, setDetailsOpen] = useState(false);

	return (
		<div className="flex items-center justify-center w-full h-full">
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant="ghost"
						className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
						size="icon"
					>
						<MoreVertical />
						<span className="sr-only">Open menu</span>
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-40">
					<DropdownMenuItem onClick={() => setDetailsOpen(true)}>
						<StickyNote className="h-4 w-4" />
						Edit notes
					</DropdownMenuItem>
					<DropdownMenuItem onClick={duplicateTimeEntry}>
						<Copy className="h-4 w-4" />
						Duplicate
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem variant="destructive" onClick={deleteTimeEntry}>
						Delete
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
			<DetailsDialog
				open={detailsOpen}
				onOpenChange={setDetailsOpen}
				timeEntryId={timeEntryId}
				entryName={entryName}
				notes={notes}
			/>
		</div>
	);
}
