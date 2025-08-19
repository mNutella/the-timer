import { IconDotsVertical } from "@tabler/icons-react";
import type { Id } from "convex/_generated/dataModel";

import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDeleteTimeEntry } from "./hooks";

export function ActionsCell({
	timeEntryId,
}: {
	timeEntryId: Id<"time_entries">;
}) {
	const deleteTimeEntry = useDeleteTimeEntry(timeEntryId);

	return (
		<div className="flex items-center justify-center w-full h-full">
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant="ghost"
						className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
						size="icon"
					>
						<IconDotsVertical />
						<span className="sr-only">Open menu</span>
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-32">
					<DropdownMenuItem variant="destructive" onClick={deleteTimeEntry}>
						Delete
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}
