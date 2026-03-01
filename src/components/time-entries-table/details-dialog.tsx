import { useState } from "react";

import type { Id } from "@/../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

import { useUpdateTimeEntryDetails } from "./hooks";

interface DetailsDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	timeEntryId: Id<"time_entries">;
	entryName: string;
	notes?: string;
}

export function DetailsDialog({
	open,
	onOpenChange,
	timeEntryId,
	entryName,
	notes: initialNotes,
}: DetailsDialogProps) {
	const [notes, setNotes] = useState(initialNotes ?? "");
	const updateDetails = useUpdateTimeEntryDetails(timeEntryId);

	const handleSave = () => {
		updateDetails({ notes });
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Entry Notes</DialogTitle>
					<DialogDescription>{entryName || "Untitled entry"}</DialogDescription>
				</DialogHeader>
				<div className="flex flex-col gap-2">
					<Label htmlFor="notes">Notes</Label>
					<textarea
						id="notes"
						className="flex min-h-[120px] w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
						placeholder="Add notes about this entry..."
						value={notes}
						onChange={(e) => setNotes(e.target.value)}
					/>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button onClick={handleSave}>Save</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
