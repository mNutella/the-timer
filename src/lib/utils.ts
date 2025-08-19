import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function formatDuration(milliseconds: number) {
	const seconds = Math.floor(milliseconds / 1000);
	const hrs = Math.floor(seconds / 3600);
	const mins = Math.floor((seconds % 3600) / 60);
	const secs = seconds % 60;

	return [
		`${hrs > 0 ? (hrs > 9 ? hrs : `0${hrs}`) : "00"}:${mins > 0 ? (mins > 9 ? mins : `0${mins}`) : "00"}:${secs > 0 ? (secs > 9 ? secs : `0${secs}`) : "00"}`,
	].join(":");
}

export function formatTimeForInput(date?: Date) {
	if (!date) return "";

	const hours = String(date.getHours()).padStart(2, "0");
	const minutes = String(date.getMinutes()).padStart(2, "0");
	const seconds = String(date.getSeconds()).padStart(2, "0");

	return `${hours}:${minutes}:${seconds}`;
}

export function parseDurationToMilliseconds(durationStr: string) {
	const timeParts = durationStr.split(":");
	let duration = 0;

	if (timeParts.length >= 3) {
		const hours = parseInt(timeParts[0]) || 0;
		const minutes = parseInt(timeParts[1]) || 0;
		const seconds = parseInt(timeParts[2]) || 0;
		duration = (hours * 3600 + minutes * 60 + seconds) * 1000;
	}

	return duration;
}
