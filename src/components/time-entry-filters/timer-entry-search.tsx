import { IconSearch } from "@tabler/icons-react";
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
			<div className="flex items-center gap-2 rounded-md border border-input bg-background px-4 h-9">
				<IconSearch size={24} />
				<Input
					id="time-entry-search"
					className="border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 h-fit rounded-none"
					placeholder="Search time entries"
					value={value}
					onChange={(e) => onChange(e.target.value)}
				/>
			</div>
		</div>
	);
}
