import * as React from "react";

import type { Id } from "@/../convex/_generated/dataModel";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useUpdateActivityName } from "./hooks";

export function ActivityCell({
	activityId,
	activityName,
}: {
	activityId: Id<"activities">;
	activityName: string;
}) {
	const [value, setValue] = React.useState(activityName);
	const updateName = useUpdateActivityName(activityId);
	const isSubmittingRef = React.useRef(false);
	const inputRef = React.useRef<HTMLInputElement>(null);

	React.useEffect(() => {
		setValue(activityName);
		isSubmittingRef.current = false;
	}, [activityName]);

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				isSubmittingRef.current = true;
				if (value === activityName) return;

				updateName(value);
				inputRef.current?.blur();
			}}
		>
			<Label htmlFor={`${activityId}-name`} className="sr-only">
				Duration
			</Label>
			<Input
				className="px-4 hover:bg-input/30 focus-visible:bg-background dark:hover:bg-input/30 dark:focus-visible:bg-input/30 w-fit border-transparent bg-transparent shadow-none focus-visible:border dark:bg-transparent"
				ref={inputRef}
				id={`${activityId}-name`}
				value={value}
				onChange={(e) => {
					setValue(e.target.value);
				}}
				onBlur={() => {
					if (isSubmittingRef.current) return;

					setValue(activityName);
					isSubmittingRef.current = false;
				}}
			/>
		</form>
	);
}
