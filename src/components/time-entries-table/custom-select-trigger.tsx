import {
	BrushCleaning,
	ChevronsUpDown,
	type LucideProps,
	Search,
} from "lucide-react";
import type { SelectableItem } from "@/components/searchable-combobox";
import { ComboboxTrigger } from "@/components/ui/combobox-infinity";
import { useComboboxContext } from "@/components/ui/combobox-infinity/hooks";
import { cn } from "@/lib/utils";

export function CustomSelectTrigger<T extends SelectableItem>({
	id,
	className,
	value,
	placeholder,
	icon,
}: {
	id?: string;
	className?: string;
	value?: T | T[];
	placeholder?: string;
	icon?: React.ComponentType<LucideProps>;
}) {
	const Icon = icon ?? Search;
	const { onValueChange } = useComboboxContext<T>();

	const items = Array.isArray(value) ? value : value ? [value] : [];
	const hasSelection = items.length > 0;

	const displayLabel =
		items.length === 0
			? (placeholder ?? "Select filter by")
			: items.length === 1
				? items[0].name
				: `${items[0].name} +${items.length - 1}`;

	const handleClear = (e: React.MouseEvent<HTMLButtonElement>) => {
		e.stopPropagation();
		onValueChange?.(undefined);
	};

	return (
		<ComboboxTrigger
			id={id}
			className={cn(
				className,
				"w-fit lg:w-[200px]",
				hasSelection &&
				"bg-primary text-primary-foreground hover:bg-primary/90",
			)}
		>
			<Icon />
			<span className="hidden lg:inline truncate">{displayLabel}</span>
			{hasSelection ? (
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
		</ComboboxTrigger>
	);
}
