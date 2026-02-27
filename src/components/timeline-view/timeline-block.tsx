import { forwardRef } from "react";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatDuration, cn } from "@/lib/utils";
import type { PositionedEntry } from "./layout";

function formatTime(ms: number): string {
	const d = new Date(ms);
	return d.toLocaleTimeString("en-US", {
		hour: "numeric",
		minute: "2-digit",
	});
}

interface TimelineBlockProps {
	positioned: PositionedEntry;
	isRunning: boolean;
	onClick: () => void;
	isSelected: boolean;
}

const TimelineBlock = forwardRef<HTMLDivElement, TimelineBlockProps>(
	function TimelineBlock({ positioned, isRunning, onClick, isSelected }, ref) {
		const { entry, top, height, left, width, color } = positioned;
		const name = entry.name || "Untitled";
		const startTime = entry.start_time!;
		const endTime = entry.end_time ?? Date.now();
		const duration = entry.duration ?? endTime - startTime;

		const timeRange = `${formatTime(startTime)} – ${formatTime(endTime)}`;
		const tooltipLines = [
			name,
			timeRange,
			entry.client?.name && `Client: ${entry.client.name}`,
			entry.project?.name && `Project: ${entry.project.name}`,
			entry.category?.name && `Category: ${entry.category.name}`,
			`Duration: ${formatDuration(duration)}`,
		].filter(Boolean);

		return (
			<Tooltip>
				<TooltipTrigger asChild>
					<div
						ref={ref}
						role="button"
						tabIndex={0}
						onClick={onClick}
						onKeyDown={(e) => {
							if (e.key === "Enter" || e.key === " ") onClick();
						}}
						className={cn(
							"absolute rounded-sm cursor-pointer transition-shadow",
							"hover:shadow-md hover:z-20 focus-visible:ring-2 focus-visible:ring-ring",
							"bg-card border border-border overflow-hidden",
							isSelected && "ring-2 ring-ring z-20",
							isRunning && "border-b-0",
						)}
						style={{
							top: `${top}px`,
							height: `${height}px`,
							left,
							width,
							borderLeftWidth: "3px",
							borderLeftColor: color,
						}}
					>
						{/* Animated bottom edge for running timers */}
						{isRunning && (
							<div
								className="absolute bottom-0 left-0 right-0 h-0.5 animate-pulse"
								style={{ backgroundColor: color }}
							/>
						)}
						<div className="px-1.5 py-0.5 h-full flex flex-col justify-center min-w-0">
							{height >= 40 ? (
								<>
									<span className="text-xs font-medium truncate leading-tight">
										{name}
									</span>
									<span className="text-[10px] text-muted-foreground truncate leading-tight">
										{timeRange}
									</span>
								</>
							) : height >= 25 ? (
								<span className="text-xs font-medium truncate leading-tight">
									{name}
								</span>
							) : null}
						</div>
					</div>
				</TooltipTrigger>
				<TooltipContent side="right" className="text-xs space-y-0.5">
					{tooltipLines.map((line, i) => (
						<div key={i} className={i === 0 ? "font-medium" : ""}>
							{line}
						</div>
					))}
				</TooltipContent>
			</Tooltip>
		);
	},
);

export default TimelineBlock;
