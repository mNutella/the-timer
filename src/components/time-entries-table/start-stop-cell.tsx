import { Pause, Play } from "lucide-react";

import type { Id } from "@/../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { useStartStopTimeEntry } from "./hooks";

export function StartStopCell({
	timeEntryId,
	inProgress,
}: {
	timeEntryId: Id<"time_entries">;
	inProgress: boolean;
}) {
	const { startTimer, stopTimer } = useStartStopTimeEntry(timeEntryId);

	if (inProgress) {
		return (
			<Button
				variant="ghost"
				className="data-[state=open]:bg-muted text-muted-foreground flex h-10 w-10"
				size="icon"
				onClick={stopTimer}
			>
				<Pause className="size-6" />
				<span className="sr-only">Stop</span>
			</Button>
		);
	}

	return (
		<Button
			variant="ghost"
			className="data-[state=open]:bg-muted text-muted-foreground flex h-10 w-10"
			size="icon"
			onClick={startTimer}
		>
			<Play className="size-6" />
			<span className="sr-only">Start</span>
		</Button>
	);
}
