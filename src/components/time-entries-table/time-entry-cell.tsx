import * as React from "react";

import type { Id } from "@/../convex/_generated/dataModel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CELL_INPUT_CLASS, useUpdateTimeEntryName } from "./hooks";

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
				Name
			</Label>
			<Input
				className={CELL_INPUT_CLASS}
				ref={inputRef}
				id={`${timeEntryId}-name`}
				value={value}
				onChange={(e) => setValue(e.target.value)}
				onBlur={() => {
					if (isSubmittingRef.current) return;
					setValue(timeEntryName);
					isSubmittingRef.current = false;
				}}
			/>
		</form>
	);
}
