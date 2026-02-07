import * as React from "react";

import type { Id } from "@/../convex/_generated/dataModel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDuration, parseDurationToMilliseconds } from "@/lib/utils";
import { CELL_INPUT_CLASS, useUpdateDuration } from "./hooks";

export function DurationCell({
	timeEntryId,
	duration,
	startTime,
	inProgress,
}: {
	timeEntryId: Id<"time_entries">;
	duration: number;
	startTime: number;
	inProgress: boolean;
}) {
	const computeNowValue = React.useCallback(() => {
		if (inProgress && startTime) {
			return formatDuration(Math.max(0, Date.now() - startTime));
		}
		return formatDuration(duration || 0);
	}, [inProgress, startTime, duration]);

	const [value, setValue] = React.useState(computeNowValue());
	const [isEditing, setIsEditing] = React.useState(false);
	const intervalRef = React.useRef<number | null>(null);
	const inputRef = React.useRef<HTMLInputElement>(null);
	const isSubmittingRef = React.useRef(false);
	const pendingDurationMsRef = React.useRef<number | null>(null);
	const updateDuration = useUpdateDuration(timeEntryId);

	React.useEffect(() => {
		if (isEditing) return;
		if (
			pendingDurationMsRef.current !== null &&
			pendingDurationMsRef.current !== duration
		)
			return;

		setValue(computeNowValue());

		if (pendingDurationMsRef.current === duration) {
			pendingDurationMsRef.current = null;
		}
	}, [computeNowValue, isEditing, duration]);

	React.useEffect(() => {
		if (!inProgress || isEditing) {
			if (intervalRef.current) {
				window.clearInterval(intervalRef.current);
				intervalRef.current = null;
			}
			return;
		}

		intervalRef.current = window.setInterval(() => {
			setValue(formatDuration(Math.max(0, Date.now() - startTime)));
		}, 1000);

		return () => {
			if (intervalRef.current) {
				window.clearInterval(intervalRef.current);
				intervalRef.current = null;
			}
		};
	}, [inProgress, isEditing, startTime]);

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				isSubmittingRef.current = true;
				if (value === formatDuration(duration)) {
					setIsEditing(false);
					return;
				}
				pendingDurationMsRef.current = parseDurationToMilliseconds(value);
				updateDuration(value);
				setIsEditing(false);
				inputRef.current?.blur();
			}}
		>
			<Label htmlFor={`${timeEntryId}-duration`} className="sr-only">
				Duration
			</Label>
			<Input
				ref={inputRef}
				className={CELL_INPUT_CLASS}
				value={value}
				onFocus={() => setIsEditing(true)}
				onChange={(e) => {
					const cursorPosition = e.target.selectionStart;
					setValue(e.target.value);
					setTimeout(() => {
						e.target?.setSelectionRange(cursorPosition, cursorPosition);
					}, 0);
				}}
				onBlur={() => {
					if (inProgress) setValue(computeNowValue());
					setIsEditing(false);
					isSubmittingRef.current = false;
				}}
			/>
		</form>
	);
}
