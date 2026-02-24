"use client";

import type { Id } from "convex/_generated/dataModel";
import type { FunctionReference, OptionalRestArgs } from "convex/server";
import { Check, PlusCircle } from "lucide-react";
import * as React from "react";
import {
	Combobox,
	ComboboxContent,
	ComboboxInput,
	ComboboxList,
	ComboboxTrigger,
} from "@/components/ui/combobox-infinity";
import { useComboboxContext } from "@/components/ui/combobox-infinity/hooks";
import {
	CommandGroup,
	CommandItem,
	CommandSeparator,
} from "@/components/ui/command";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useStablePaginatedQuery } from "@/hooks/useStablePaginatedQuery";
import { cn } from "@/lib/utils";

export type SelectableItem = {
	_id: string;
	name: string;
};

type PaginatedQuery = FunctionReference<
	"query",
	"public",
	{ paginationOpts: { numItems: number; cursor: string | null } },
	{
		page: { _id: string; name: string }[];
		isDone: boolean;
		continueCursor: string;
	}
>;

type TriggerProps<T extends SelectableItem> = {
	id?: string;
	className?: string;
	value?: T | T[];
	placeholder?: string;
};

type BaseSearchableComboboxProps<
	T extends SelectableItem,
	Q extends PaginatedQuery,
> = {
	id?: string;
	className?: string;
	apiQuery: Q;
	placeholder?: string;
	searchPlaceholder?: string;
	queryArgs?: OptionalRestArgs<Q>[0];
	onSelect?: (name: string) => void;
	comboboxTrigger?: React.ComponentType<TriggerProps<T>>;
};

type SearchableComboboxProps<
	T extends SelectableItem,
	Q extends PaginatedQuery,
> =
	| (BaseSearchableComboboxProps<T, Q> & {
			type?: "single";
			value?: T | null;
			onValueChange: (item?: T) => void;
	  })
	| (BaseSearchableComboboxProps<T, Q> & {
			type: "multiple";
			value?: T[];
			onItemSelectChange: (items: T[]) => void;
	  });

function DefaultComboboxTrigger<T extends SelectableItem>({
	id,
	className,
	value,
	placeholder,
}: TriggerProps<T>) {
	const displayValue = Array.isArray(value)
		? value.map((item) => item.name).join(", ")
		: value?.name;

	return (
		<ComboboxTrigger id={id} className={cn("w-full overflow-hidden", className)}>
			<span className="truncate">{displayValue || (placeholder ?? "Select")}</span>
		</ComboboxTrigger>
	);
}

export function SearchableCombobox<
	T extends SelectableItem,
	Q extends PaginatedQuery,
>(props: SearchableComboboxProps<T, Q>) {
	const {
		id,
		value,
		className,
		apiQuery,
		placeholder,
		searchPlaceholder,
		queryArgs,
		onSelect,
		comboboxTrigger,
	} = props;

	const [search, setSearch] = React.useState("");
	const Trigger = comboboxTrigger ?? DefaultComboboxTrigger;
	const isMultiple = props.type === "multiple";

	const selectedItemsMap = React.useMemo(() => {
		const items = !value ? [] : Array.isArray(value) ? value : [value];
		return new Map(items.map((item) => [item._id, item]));
	}, [value]);

	const handleItemSelect = (item: T | undefined) => {
		if (!item) {
			if (isMultiple) props.onItemSelectChange([]);
			else props.onValueChange(undefined);
			return;
		}

		if (isMultiple) {
			const current = props.value || [];
			const exists = current.some((i) => i._id === item._id);
			props.onItemSelectChange(
				exists ? current.filter((i) => i._id !== item._id) : [...current, item],
			);
		} else {
			props.onValueChange(props.value?._id === item._id ? undefined : item);
		}
	};

	return (
		<Combobox
			selectedItems={selectedItemsMap}
			onValueChange={handleItemSelect}
			onPopoverOpenChange={(open) => {
				if (!open) {
					setTimeout(() => setSearch(""), 100);
				}
			}}
		>
			<Trigger
				id={id}
				className={cn("w-full", className)}
				value={(value ?? undefined) as T | T[] | undefined}
				placeholder={placeholder}
			/>
			<ComboboxContent>
				<SearchableComboboxContent<T, Q>
					apiQuery={apiQuery}
					search={search}
					setSearch={setSearch}
					searchPlaceholder={searchPlaceholder}
					queryArgs={queryArgs}
					onSelect={onSelect}
					closeOnSelect={!isMultiple}
				/>
			</ComboboxContent>
		</Combobox>
	);
}

function SearchableComboboxContent<
	T extends SelectableItem,
	Q extends PaginatedQuery,
>({
	apiQuery,
	search,
	setSearch,
	searchPlaceholder,
	queryArgs,
	onSelect,
	closeOnSelect = true,
}: {
	apiQuery: Q;
	search: string;
	setSearch: (search: string) => void;
	searchPlaceholder?: string;
	queryArgs?: OptionalRestArgs<Q>[0];
	onSelect?: (name: string) => void;
	closeOnSelect?: boolean;
}) {
	const { selectedItems, onValueChange, setIsOpen } = useComboboxContext<T>();

	const {
		results: items,
		loadMore,
		status,
	} = useStablePaginatedQuery<T, typeof apiQuery>(
		apiQuery,
		{
			...(queryArgs as any),
			userId: import.meta.env.VITE_USER_ID as Id<"users">,
			query: search.trim().toLowerCase(),
		},
		{ initialNumItems: 7 },
	);

	const handleSelect = () => {
		if (!search || !onSelect) return;
		onSelect(search);
		setSearch("");
		setIsOpen(false);
	};

	const handleSelectItem = (item: T) => {
		onValueChange?.(item);
		if (closeOnSelect) {
			setSearch("");
			setIsOpen(false);
		}
	};

	const loaderRef = React.useRef<HTMLDivElement | null>(null);
	const scrollAreaRef = React.useRef<HTMLDivElement | null>(null);

	React.useEffect(() => {
		if (
			status !== "CanLoadMore" ||
			!loaderRef.current ||
			!scrollAreaRef.current
		)
			return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting) loadMore(2);
			},
			{ root: scrollAreaRef.current, threshold: 0.1 },
		);

		observer.observe(loaderRef.current);
		return () => observer.disconnect();
	}, [status, loadMore]);

	const showCreateOption =
		onSelect &&
		search.length > 0 &&
		!items.some((item) => item.name.toLowerCase() === search.toLowerCase());

	const searchLower = search.trim().toLowerCase();

	const selectedItemsList = React.useMemo(() => {
		if (!selectedItems || selectedItems.size === 0) return [];
		return Array.from(selectedItems.values()).filter(
			(item) => !searchLower || item.name.toLowerCase().includes(searchLower),
		);
	}, [selectedItems, searchLower]);

	const unselectedItems = React.useMemo(() => {
		if (!selectedItems || selectedItems.size === 0) return items;
		return items.filter((item) => !selectedItems.has(item._id));
	}, [items, selectedItems]);

	const hasSelectedItems = selectedItemsList.length > 0;
	const hasUnselectedItems = unselectedItems.length > 0;
	const hasNoItems =
		!hasSelectedItems && !hasUnselectedItems && status !== "LoadingFirstPage";

	const renderItem = (item: { _id: string; name: string }) => (
		<CommandItem
			key={item._id}
			value={item._id}
			onSelect={() => handleSelectItem(item as T)}
		>
			{item.name}
			<Check
				className={cn(
					"ml-auto",
					selectedItems?.has(item._id) ? "opacity-100" : "opacity-0",
				)}
			/>
		</CommandItem>
	);

	return (
		<>
			<ComboboxInput
				placeholder={searchPlaceholder ?? "Search..."}
				value={search}
				onValueChange={setSearch}
			/>
			<ComboboxList>
				<ScrollArea ref={scrollAreaRef} className="h-[200px]">
					{hasSelectedItems && (
						<CommandGroup>{selectedItemsList.map(renderItem)}</CommandGroup>
					)}
					{hasSelectedItems && hasUnselectedItems && <CommandSeparator />}
					{hasUnselectedItems && (
						<CommandGroup>{unselectedItems.map(renderItem)}</CommandGroup>
					)}
					{hasNoItems && (
						<p className="py-6 text-center text-sm text-muted-foreground">
							No item found.
						</p>
					)}
					{status === "CanLoadMore" && (
						<div ref={loaderRef} className="h-4 w-full" />
					)}
				</ScrollArea>
				{showCreateOption && (
					<CommandGroup>
						<CommandItem
							value={search}
							onSelect={handleSelect}
							className="flex w-full items-center gap-2"
						>
							<PlusCircle className="h-4 w-4" />
							<span>Create "{search}"</span>
						</CommandItem>
					</CommandGroup>
				)}
			</ComboboxList>
		</>
	);
}
