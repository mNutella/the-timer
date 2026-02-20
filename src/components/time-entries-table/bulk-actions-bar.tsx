import { IconTrash, IconX } from "@tabler/icons-react";
import type { Id } from "@/../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { useBulkDeleteTimeEntries } from "./hooks";

interface BulkActionsBarProps {
	selectedCount: number;
	totalCount: number;
	selectedIds: Id<"time_entries">[];
	onClearSelection: () => void;
}

export function BulkActionsBar({
	selectedCount,
	selectedIds,
	onClearSelection,
}: BulkActionsBarProps) {
	const bulkDelete = useBulkDeleteTimeEntries();

	const handleBulkDelete = () => {
		bulkDelete(selectedIds);
		onClearSelection();
	};

	if (selectedCount === 0) return null;

	return (
		<div className="flex items-center gap-2">
			<span className="text-sm font-medium">
				{selectedCount} selected
			</span>
			<Button
				variant="ghost"
				size="sm"
				className="h-7 px-2"
				onClick={onClearSelection}
			>
				<IconX className="h-3.5 w-3.5" />
				Clear
			</Button>
			<Button
				variant="destructive"
				size="sm"
				className="h-7"
				onClick={handleBulkDelete}
			>
				<IconTrash className="h-3.5 w-3.5 mr-1" />
				Delete ({selectedCount})
			</Button>
		</div>
	);
}
