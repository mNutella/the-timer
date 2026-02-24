import { Clock2Icon } from "lucide-react";
import { useEffect, useState } from "react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { formatTimeForInput } from "@/lib/utils";

interface TimeEntriesStartEndCalendarProps {
	startTime: number;
	endTime?: number;
	onApplyClick: (dateRange: DateRange) => void;
}

function TimeInput({
	date,
	onDateChange,
	label,
	id,
}: {
	date: Date | undefined;
	onDateChange: (newDate: Date) => void;
	label: string;
	id: string;
}) {
	const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (!date) return;
		const timeParts = e.target.value.split(":");
		const hours = parseInt(timeParts[0], 10);
		const minutes = parseInt(timeParts[1], 10);
		const seconds = timeParts[2] ? parseInt(timeParts[2], 10) : 0;

		const newDate = new Date(date);
		newDate.setHours(hours, minutes, seconds);
		onDateChange(newDate);
	};

	return (
		<div className="flex w-full flex-col gap-3">
			<Label htmlFor={id}>{label}</Label>
			<div className="relative flex w-full items-center gap-2">
				<Clock2Icon className="pointer-events-none absolute left-2.5 size-4 select-none text-muted-foreground" />
				<Input
					id={id}
					type="time"
					step="1"
					value={formatTimeForInput(date)}
					className="appearance-none pl-8 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
					onChange={handleTimeChange}
				/>
			</div>
		</div>
	);
}

function formatCompactDateTime(
	start: Date | undefined,
	end: Date | undefined,
): React.ReactNode {
	if (!start) return <span className="text-muted-foreground">Select Date</span>;

	const fmtDate = (d: Date) =>
		d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
	const fmtTime = (d: Date) =>
		d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

	if (!end) return `${fmtDate(start)}, ${fmtTime(start)}`;

	const sameDay =
		start.getFullYear() === end.getFullYear() &&
		start.getMonth() === end.getMonth() &&
		start.getDate() === end.getDate();

	if (sameDay) {
		const startParts = fmtTime(start).match(/^(.+?)(\s?[AP]M)$/i);
		const endParts = fmtTime(end).match(/^(.+?)(\s?[AP]M)$/i);
		if (startParts && endParts) {
			const samePeriod =
				startParts[2].trim() === endParts[2].trim();
			const startStr = samePeriod ? startParts[1] : fmtTime(start);
			return `${fmtDate(start)} \u00b7 ${startStr} \u2013 ${fmtTime(end)}`;
		}
		return `${fmtDate(start)} \u00b7 ${fmtTime(start)} \u2013 ${fmtTime(end)}`;
	}

	return (
		<>
			<div>{`${fmtDate(start)}, ${fmtTime(start)}`}</div>
			<div>{`${fmtDate(end)}, ${fmtTime(end)}`}</div>
		</>
	);
}

export default function TimeEntriesStartEndCalendar({
	startTime,
	endTime,
	onApplyClick,
}: TimeEntriesStartEndCalendarProps) {
	const [open, setOpen] = useState(false);
	const [initialRange, setInitialRange] = useState<DateRange>({
		from: new Date(startTime),
		to: endTime ? new Date(endTime) : undefined,
	});
	const [currentRange, setCurrentRange] = useState<DateRange>({
		from: new Date(startTime),
		to: endTime ? new Date(endTime) : undefined,
	});
	const [isRangeChanged, setIsRangeChanged] = useState(false);
	const [isConfirmed, setIsConfirmed] = useState(false);

	useEffect(() => {
		setInitialRange({
			from: new Date(startTime),
			to: endTime ? new Date(endTime) : undefined,
		});

		return () => {
			setIsRangeChanged(false);
			setIsConfirmed(false);
		};
	}, [startTime, endTime]);

	const handleOpenChange = (open: boolean) => {
		if (!open && !isConfirmed) {
			setCurrentRange(initialRange);
		}

		setOpen(open);
	};

	return (
		<Popover open={open} onOpenChange={handleOpenChange}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					id="dates"
					className="w-fit border-transparent bg-transparent shadow-none hover:bg-input/30 focus-visible:border focus-visible:bg-input/30 box-content"
					onClick={() => setOpen((prev) => !prev)}
				>
					<div className="flex flex-col text-sm">
						{formatCompactDateTime(initialRange.from, initialRange.to)}
					</div>
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-auto overflow-hidden p-0" align="start">
				<Card className="w-fit rounded-none border-none bg-transparent py-4">
					<CardContent className="px-4">
						<Calendar
							required
							mode="range"
							selected={currentRange}
							onSelect={(selected) => {
								if (selected) {
									setCurrentRange(selected);
									setIsRangeChanged(true);
								}
							}}
							className="bg-transparent p-0"
							captionLayout="dropdown"
						/>
					</CardContent>
					<CardFooter className="flex flex-col gap-6 px-4 !pt-4">
						<TimeInput
							id="time-from"
							label="Start Time"
							date={currentRange.from}
							onDateChange={(newDate) => {
								setCurrentRange((prev) => ({ ...prev, from: newDate }));
								setIsRangeChanged(true);
							}}
						/>
						<TimeInput
							id="time-to"
							label="End Time"
							date={currentRange.to}
							onDateChange={(newDate) => {
								setCurrentRange((prev) => ({ ...prev, to: newDate }));
								setIsRangeChanged(true);
							}}
						/>
					</CardFooter>
					<CardFooter className="flex flex-col gap-2 px-4">
						<Button
							className="w-full"
							disabled={!isRangeChanged}
							onClick={() => {
								setIsConfirmed(true);
								setOpen(false);
								onApplyClick(currentRange);
							}}
						>
							Apply
						</Button>
					</CardFooter>
				</Card>
			</PopoverContent>
		</Popover>
	);
}
