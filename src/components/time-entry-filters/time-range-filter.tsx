import { IconCalendar } from "@tabler/icons-react";
import { BrushCleaning, ChevronsUpDown } from "lucide-react";
import * as React from "react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export function TimeRangeFilter({
	value,
	onChange,
}: {
	value?: DateRange;
	onChange: (value?: DateRange) => void;
}) {
	const [open, setOpen] = React.useState(false);
	const [timeRange, setTimeRange] = React.useState<DateRange | undefined>(
		value,
	);
	const itemSelected = Boolean(timeRange?.from && timeRange?.to);

	const handleClear = (e: React.MouseEvent<HTMLButtonElement>) => {
		e.stopPropagation();
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
					className={cn(timeRange && "bg-primary text-primary-foreground")}
					onClick={() => setOpen(true)}
				>
					<IconCalendar />
					<div className="flex flex-col text-sm">
						{!timeRange?.from && !timeRange?.to ? (
							<span>Select Date</span>
						) : (
							<div className="flex text-center gap-x-1">
								<div>
									{timeRange?.from?.toLocaleDateString() || (
										<span>Select Date</span>
									)}
								</div>
								<div>-</div>
								<div>
									{timeRange?.to?.toLocaleDateString() || (
										<span className="">Select Date</span>
									)}
								</div>
							</div>
						)}
					</div>
					{itemSelected ? (
						<button
							type="button"
							onClick={handleClear}
							className="ml-2 p-1.5 hover:bg-muted-foreground/10 rounded-sm group outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
						>
							<BrushCleaning className="h-4 w-4 shrink-0 group-hover:text-black" />
						</button>
					) : (
						<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-auto overflow-hidden p-0" align="start">
				<Card className="w-fit rounded-none border-none bg-transparent py-4">
					<CardContent className="px-4">
						<Calendar
							required
							mode="range"
							selected={timeRange}
							onSelect={setTimeRange}
							className="bg-transparent p-0"
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
