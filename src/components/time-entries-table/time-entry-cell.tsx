import { StickyNote } from "lucide-react";
import * as React from "react";

import type { Id } from "@/../convex/_generated/dataModel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { CELL_INPUT_CLASS, SaveHint, useUpdateTimeEntryName } from "./hooks";

export function TimeEntryCell({
	timeEntryId,
	timeEntryName,
	notes,
}: {
	timeEntryId: Id<"time_entries">;
	timeEntryName: string;
	notes?: string;
}) {
	const [value, setValue] = React.useState(timeEntryName);
	const [isFocused, setIsFocused] = React.useState(false);
	const updateName = useUpdateTimeEntryName(timeEntryId);
	const isSubmittingRef = React.useRef(false);
	const inputRef = React.useRef<HTMLInputElement>(null);
	const prevTimeEntryNameRef = React.useRef(timeEntryName);

	if (prevTimeEntryNameRef.current !== timeEntryName) {
		prevTimeEntryNameRef.current = timeEntryName;
		if (!isFocused) {
			setValue(timeEntryName);
			isSubmittingRef.current = false;
		}
	}

	const isDirty = isFocused && value !== timeEntryName;

	return (
		<div className="flex items-center gap-1.5 min-w-0 w-full">
			<form
				onSubmit={(e) => {
					e.preventDefault();
					isSubmittingRef.current = true;
					if (value === timeEntryName) {
						inputRef.current?.blur();
						return;
					}
					updateName(value);
					inputRef.current?.blur();
				}}
				className="relative min-w-0 flex-1"
			>
				<Label htmlFor={`${timeEntryId}-name`} className="sr-only">
					Name
				</Label>
				<Input
					className={CELL_INPUT_CLASS}
					ref={inputRef}
					id={`${timeEntryId}-name`}
					value={value}
					onChange={(e) => setValue(e.target.value)}
					onFocus={() => setIsFocused(true)}
					onBlur={() => {
						setIsFocused(false);
						if (isSubmittingRef.current) return;
						setValue(timeEntryName);
						isSubmittingRef.current = false;
					}}
					onKeyDown={(e) => {
						if (e.key === "Escape") {
							setValue(timeEntryName);
							inputRef.current?.blur();
						}
					}}
				/>
				<SaveHint visible={isDirty} />
			</form>
			{notes ? (
				<Tooltip>
					<TooltipTrigger asChild>
						<StickyNote className="size-3.5 text-muted-foreground/50 shrink-0 cursor-default" />
					</TooltipTrigger>
					<TooltipContent side="top" className="max-w-xs">
						{notes}
					</TooltipContent>
				</Tooltip>
			) : null}
		</div>
	);
}
