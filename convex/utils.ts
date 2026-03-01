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

	let nextDuration: number | undefined;
	if (nextStart !== undefined && nextEnd !== undefined) {
		if (nextEnd < nextStart) throw new Error("end_time cannot be before start_time");
		nextDuration = nextEnd - nextStart;
	}

	return { start_time: nextStart, end_time: nextEnd, duration: nextDuration };
}

export function updateIfDefined<T>(target: Partial<T>, obj: Partial<T>) {
	for (const key in obj) {
		if (obj[key] !== undefined) target[key] = obj[key];
	}
}

export function getStartOfDay(startDate: number) {
	const startOfDay = new Date(startDate);
	startOfDay.setHours(0, 0, 0, 0);

	return startOfDay.getTime();
}

export function getEndOfDay(endDate: number) {
	const endOfDay = new Date(endDate);
	endOfDay.setHours(23, 59, 59, 999);

	return endOfDay.getTime();
}
