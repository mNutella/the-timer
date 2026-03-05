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

/**
 * WARNING: These use the server's timezone (UTC on Convex).
 * Only use on the client side where the browser provides local timezone.
 * For server-side analytics, use getLocalDayStart/getLocalDayEnd instead.
 */
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

/**
 * Timezone-aware day boundary functions for server-side use.
 * offsetMs = -(new Date().getTimezoneOffset()) * 60000
 * (positive for timezones east of UTC, e.g. +19800000 for IST)
 */
export function getLocalDayStart(utcTimestamp: number, offsetMs: number): number {
	const localMs = utcTimestamp + offsetMs;
	const localDayStart = localMs - (((localMs % 86_400_000) + 86_400_000) % 86_400_000);
	return localDayStart - offsetMs;
}

export function getLocalDayEnd(utcTimestamp: number, offsetMs: number): number {
	return getLocalDayStart(utcTimestamp, offsetMs) + 86_400_000 - 1;
}

export function formatLocalDate(utcTimestamp: number, offsetMs: number): string {
	const localMs = utcTimestamp + offsetMs;
	const d = new Date(localMs);
	const year = d.getUTCFullYear();
	const month = String(d.getUTCMonth() + 1).padStart(2, "0");
	const day = String(d.getUTCDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

export function advanceOneLocalDay(utcDayStart: number, offsetMs: number): number {
	return getLocalDayStart(utcDayStart + 86_400_000, offsetMs);
}
