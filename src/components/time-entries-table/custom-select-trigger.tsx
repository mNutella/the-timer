import { ChevronsUpDown, BrushCleaning } from "lucide-react";

import { IconSearch } from "@tabler/icons-react";
import type { IconProps } from "@tabler/icons-react";
import { ComboboxTrigger } from "@/components/ui/combobox-infinity";
import type { SelectableItem } from "@/components/searchable-combobox";
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
	value?: T;
	placeholder?: string;
	icon?: React.ComponentType<IconProps>;
}) {
	const Icon = icon ?? IconSearch;
	const { onValueChange } = useComboboxContext<T>();

	const itemSelected = Boolean(value?.name);

	const handleClear = (e: React.MouseEvent<HTMLButtonElement>) => {
		e.stopPropagation();
		onValueChange?.(undefined);
	};

	return (
		<ComboboxTrigger
			id={id}
			className={cn(
				className,
				"w-fit",
				value && "bg-primary text-primary-foreground",
			)}
		>
			<Icon />
			<span className="hidden lg:inline">
				{value?.name ?? placeholder ?? "Select filter by"}
			</span>
			{itemSelected ? (
				<button type="button" onClick={handleClear} className="ml-2 p-1.5 hover:bg-muted-foreground/10 rounded-sm group outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]">
					<BrushCleaning className="h-4 w-4 shrink-0 group-hover:text-black" />
				</button>
			) : (
				<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
			)}
		</ComboboxTrigger>
	);
}
