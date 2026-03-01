import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function TimerEntrySearch({
	value,
	onChange,
}: {
	value: string;
	onChange: (value: string) => void;
}) {
	return (
		<div>
			<Label htmlFor="time-entry-search" className="sr-only">
				Search
			</Label>
			<div className="flex h-9 items-center gap-2 rounded-md border border-input bg-background px-4">
				<Search size={24} />
				<Input
					id="time-entry-search"
					className="h-fit rounded-none border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
					placeholder="Search time entries"
					value={value}
					onChange={(e) => onChange(e.target.value)}
				/>
			</div>
		</div>
	);
}
