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
	const Icon = inProgress ? Pause : Play;

	return (
		<Button
			variant="ghost"
			className="data-[state=open]:bg-muted text-muted-foreground flex h-10 w-10"
			size="icon"
			onClick={inProgress ? stopTimer : startTimer}
		>
			<Icon className="size-6" />
			<span className="sr-only">{inProgress ? "Stop" : "Start"}</span>
		</Button>
	);
}
