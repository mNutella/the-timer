import { useEffect, useState } from "react";

import { formatDuration } from "@/lib/utils";

export function useLiveElapsedTime(startTime: number, isRunning: boolean): string {
	const [elapsed, setElapsed] = useState(
		isRunning ? formatDuration(Math.max(0, Date.now() - startTime)) : "00:00:00",
	);

	useEffect(() => {
		if (!isRunning) {
			setElapsed("00:00:00");
			return;
		}
		setElapsed(formatDuration(Math.max(0, Date.now() - startTime)));
		const interval = setInterval(() => {
			setElapsed(formatDuration(Math.max(0, Date.now() - startTime)));
		}, 1000);
		return () => clearInterval(interval);
	}, [isRunning, startTime]);

	return elapsed;
}
