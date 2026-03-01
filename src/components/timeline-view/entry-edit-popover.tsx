import { Trash2 } from "lucide-react";
import { useState } from "react";

import { api } from "@/../convex/_generated/api";
import { SearchableCombobox } from "@/components/searchable-combobox";
import {
	useUpdateTimeEntryName,
	useUpdateTimeEntryClient,
	useUpdateTimeEntryProject,
	useUpdateTimeEntryCategory,
	useUpdateStartEndTime,
	useDeleteTimeEntry,
} from "@/components/time-entries-table/hooks";
import TimeEntriesStartEndCalendar from "@/components/timer-entries-start-end-calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { formatDuration } from "@/lib/utils";

import type { ExportedEntry } from "./layout";

interface EntryEditPopoverProps {
	entry: ExportedEntry;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	anchorRef: React.RefObject<HTMLElement>;
}

export default function EntryEditPopover({
	entry,
	open,
	onOpenChange,
	anchorRef,
}: EntryEditPopoverProps) {
	const [name, setName] = useState(entry.name);

	const updateName = useUpdateTimeEntryName(entry._id);
	const updateClient = useUpdateTimeEntryClient(entry._id);
	const updateProject = useUpdateTimeEntryProject(entry._id);
	const updateCategory = useUpdateTimeEntryCategory(entry._id);
	const updateStartEnd = useUpdateStartEndTime(entry._id);
	const deleteEntry = useDeleteTimeEntry(entry._id);

	const duration = entry.duration ?? (entry.end_time ?? Date.now()) - (entry.start_time ?? 0);

	const handleNameBlur = () => {
		if (name !== entry.name) updateName(name);
	};

	const handleNameKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			e.preventDefault();
			if (name !== entry.name) updateName(name);
		}
	};

	return (
		<Popover open={open} onOpenChange={onOpenChange}>
			<PopoverAnchor virtualRef={anchorRef} />
			<PopoverContent
				side="right"
				align="start"
				sideOffset={8}
				className="w-72 space-y-3 p-3"
				onOpenAutoFocus={(e) => e.preventDefault()}
			>
				{/* Name */}
				<div className="space-y-1.5">
					<Label className="text-xs text-muted-foreground">Name</Label>
					<Input
						value={name}
						onChange={(e) => setName(e.target.value)}
						onBlur={handleNameBlur}
						onKeyDown={handleNameKeyDown}
						className="h-8 text-sm"
					/>
				</div>

				{/* Client */}
				<div className="space-y-1.5">
					<Label className="text-xs text-muted-foreground">Client</Label>
					<SearchableCombobox
						id={`popover-${entry._id}-client`}
						value={entry.client ?? undefined}
						apiQuery={api.clients.searchByName}
						onValueChange={(c) => updateClient(c?._id)}
						onSelect={(n) => updateClient(undefined, n)}
						className="h-8 w-full text-sm"
					/>
				</div>

				{/* Project */}
				<div className="space-y-1.5">
					<Label className="text-xs text-muted-foreground">Project</Label>
					<SearchableCombobox
						id={`popover-${entry._id}-project`}
						value={entry.project ?? undefined}
						apiQuery={api.projects.searchByName}
						queryArgs={{
							clientId: entry.client?._id,
							query: "",
							paginationOpts: { numItems: 10, cursor: null },
						}}
						onValueChange={(p) => updateProject(p?._id)}
						onSelect={(n) => updateProject(undefined, n)}
						className="h-8 w-full text-sm"
					/>
				</div>

				{/* Category */}
				<div className="space-y-1.5">
					<Label className="text-xs text-muted-foreground">Category</Label>
					<SearchableCombobox
						id={`popover-${entry._id}-category`}
						value={entry.category ?? undefined}
						apiQuery={api.categories.searchByName}
						onValueChange={(c) => updateCategory(c?._id)}
						onSelect={(n) => updateCategory(undefined, n)}
						className="h-8 w-full text-sm"
					/>
				</div>

				{/* Start/End Time */}
				{entry.start_time && (
					<div className="space-y-1.5">
						<Label className="text-xs text-muted-foreground">Time</Label>
						<TimeEntriesStartEndCalendar
							startTime={entry.start_time}
							endTime={entry.end_time}
							onApplyClick={(range) => {
								updateStartEnd(range.from?.getTime() ?? 0, range.to?.getTime() ?? 0);
							}}
						/>
					</div>
				)}

				{/* Duration */}
				<div className="text-xs text-muted-foreground">Duration: {formatDuration(duration)}</div>

				<Separator />

				{/* Delete */}
				<Button
					variant="ghost"
					size="sm"
					className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
					onClick={() => {
						deleteEntry();
						onOpenChange(false);
					}}
				>
					<Trash2 className="mr-1.5 size-3.5" />
					Delete
				</Button>
			</PopoverContent>
		</Popover>
	);
}
