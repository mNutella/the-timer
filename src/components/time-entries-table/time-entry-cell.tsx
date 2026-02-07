import * as React from "react";

import type { Id } from "@/../convex/_generated/dataModel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpdateTimeEntryName } from "./hooks";

export function TimeEntryCell({
	timeEntryId,
	timeEntryName,
}: {
	timeEntryId: Id<"time_entries">;
	timeEntryName: string;
}) {
	const [value, setValue] = React.useState(timeEntryName);
	const updateName = useUpdateTimeEntryName(timeEntryId);
	const isSubmittingRef = React.useRef(false);
	const inputRef = React.useRef<HTMLInputElement>(null);

	React.useEffect(() => {
		setValue(timeEntryName);
		isSubmittingRef.current = false;
	}, [timeEntryName]);

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				isSubmittingRef.current = true;
				if (value === timeEntryName) return;

				updateName(value);
				inputRef.current?.blur();
			}}
		>
			<Label htmlFor={`${timeEntryId}-name`} className="sr-only">
				Duration
			</Label>
			<Input
				className="px-4 hover:bg-input/30 focus-visible:bg-background dark:hover:bg-input/30 dark:focus-visible:bg-input/30 w-fit border-transparent bg-transparent shadow-none focus-visible:border dark:bg-transparent"
				ref={inputRef}
				id={`${timeEntryId}-name`}
				value={value}
				onChange={(e) => {
					setValue(e.target.value);
				}}
				onBlur={() => {
					if (isSubmittingRef.current) return;

					setValue(timeEntryName);
					isSubmittingRef.current = false;
				}}
			/>
		</form>
	);
}
