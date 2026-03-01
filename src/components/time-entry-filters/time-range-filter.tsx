import { endOfMonth, endOfWeek, startOfMonth, startOfWeek, subMonths } from "date-fns";
import { BrushCleaning, Calendar as CalendarIcon, ChevronsUpDown } from "lucide-react";
import { useState } from "react";
import type { PointerEvent } from "react";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const DATE_PRESETS: { label: string; getRange: () => DateRange }[] = [
	{
		label: "Today",
		getRange: () => {
			const today = new Date();
			return { from: today, to: today };
		},
	},
	{
		label: "This Week",
		getRange: () => {
			const today = new Date();
			return {
				from: startOfWeek(today, { weekStartsOn: 1 }),
				to: endOfWeek(today, { weekStartsOn: 1 }),
			};
		},
	},
	{
		label: "This Month",
		getRange: () => {
			const today = new Date();
			return { from: startOfMonth(today), to: endOfMonth(today) };
		},
	},
	{
		label: "Last Month",
		getRange: () => {
			const lastMonth = subMonths(new Date(), 1);
			return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
		},
	},
];

export function TimeRangeFilter({
	value,
	onChange,
}: {
	value?: DateRange;
	onChange: (value?: DateRange) => void;
}) {
	const [open, setOpen] = useState(false);
	const [timeRange, setTimeRange] = useState<DateRange | undefined>(value);
	const itemSelected = Boolean(timeRange?.from && timeRange?.to);

	const handleClear = (e: PointerEvent<HTMLSpanElement>) => {
		e.stopPropagation();
		e.preventDefault();
		setTimeRange(undefined);
		onChange(undefined);
	};

	return (
		<Popover
			open={open}
			onOpenChange={(open) => {
				if (!open) {
					setOpen(false);
				}
			}}
		>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					id="time-range-filter"
					className={cn(timeRange && "bg-primary text-primary-foreground hover:bg-primary/90")}
					onClick={() => setOpen(true)}
				>
					<CalendarIcon />
					<div className="flex flex-col text-sm">
						{!timeRange?.from && !timeRange?.to ? (
							<span>Filter by Period</span>
						) : (
							<div className="flex gap-x-1 text-center">
								<div>{timeRange?.from?.toLocaleDateString() || <span>Filter by Period</span>}</div>
								<div>-</div>
								<div>
									{timeRange?.to?.toLocaleDateString() || (
										<span className="">Filter by Period</span>
									)}
								</div>
							</div>
						)}
					</div>
					{itemSelected ? (
						<span
							role="button"
							tabIndex={0}
							onPointerDown={handleClear}
							className="group ml-2 rounded-sm p-1.5 outline-none hover:bg-muted-foreground/10 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
						>
							<BrushCleaning className="h-4 w-4 shrink-0 group-hover:text-primary-foreground" />
						</span>
					) : (
						<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-auto overflow-hidden p-0" align="start">
				<Card className="w-fit rounded-none border-none bg-transparent py-4">
					<CardContent className="px-4">
						<div className="mb-3 flex justify-center gap-1.5">
							{DATE_PRESETS.map((preset) => (
								<Button
									key={preset.label}
									variant="outline"
									size="sm"
									className="h-7 text-xs"
									onClick={() => {
										const range = preset.getRange();
										setTimeRange(range);
										onChange(range);
										setOpen(false);
									}}
								>
									{preset.label}
								</Button>
							))}
						</div>
						<Calendar
							required
							mode="range"
							selected={timeRange}
							onSelect={setTimeRange}
							className="mx-auto bg-transparent p-0"
							captionLayout="dropdown"
						/>
					</CardContent>
					<CardFooter className="flex flex-col gap-2 px-4">
						<Button
							variant="outline"
							className="w-full"
							onClick={() => {
								setTimeRange(undefined);
								onChange(undefined);
							}}
						>
							Clear
						</Button>
						<Button
							className="w-full"
							onClick={() => {
								onChange(timeRange);
								setOpen(false);
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
