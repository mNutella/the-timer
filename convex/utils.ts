export function computeNextTiming(args: {
	currentStart?: number;
	currentEnd?: number;
	startDate?: number;
	endDate?: number;
	duration?: number;
}): { start_time?: number; end_time?: number; duration?: number } {
	let nextStart = args.startDate ?? args.currentStart;
	let nextEnd = args.endDate ?? args.currentEnd;

	if (args.duration !== undefined) {
		if (nextStart !== undefined && args.endDate === undefined) {
			nextEnd = nextStart + args.duration;
		} else if (nextEnd !== undefined && args.startDate === undefined) {
			nextStart = nextEnd - args.duration;
		}
	}

	let nextDuration: number | undefined = undefined;
	if (nextStart !== undefined && nextEnd !== undefined) {
		if (nextEnd < nextStart)
			throw new Error("end_time cannot be before start_time");
		nextDuration = nextEnd - nextStart;
	}

	return { start_time: nextStart, end_time: nextEnd, duration: nextDuration };
}

export function setIfDefined<T, K extends keyof T>(
	target: Partial<T>,
	key: K,
	value: T[K] | undefined,
) {
	if (value !== undefined) target[key] = value;
}
