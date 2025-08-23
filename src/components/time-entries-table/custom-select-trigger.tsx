import { cn } from "@/lib/utils";
import { ComboboxTrigger } from "../ui/combobox-infinity";
import { IconSearch } from "@tabler/icons-react";
import type { IconProps } from "@tabler/icons-react";
import type { SelectableItem } from "@/components/searchable-combobox";

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

	return (
		<ComboboxTrigger
			id={id}
			className={cn(
				className,
				"w-fit",
				value && "bg-primary text-primary-foreground",
			)}
			showChevron
		>
			<Icon />
			<span className="hidden lg:inline">
				{value?.name ?? placeholder ?? "Select filter by"}
			</span>
		</ComboboxTrigger>
	);
}
