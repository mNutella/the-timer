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
import { CommandGroup, CommandItem } from "@/components/ui/command";
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
		page: {
			_id: string;
			name: string;
		}[];
		isDone: boolean;
		continueCursor: string;
	}
>;

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
	comboboxTrigger?: React.ComponentType<{
		id?: string;
		className?: string;
		value?: T | T[];
		placeholder?: string;
	}>;
};

type SingleSearchableComboboxProps<
	T extends SelectableItem,
	Q extends PaginatedQuery,
> = BaseSearchableComboboxProps<T, Q> & {
	type?: "single";
	value?: T | null;
	onValueChange: (item?: T) => void;
};

type MultipleSearchableComboboxProps<
	T extends SelectableItem,
	Q extends PaginatedQuery,
> = BaseSearchableComboboxProps<T, Q> & {
	type: "multiple";
	value?: T[];
	onItemSelectChange: (items: T[]) => void;
};

type SearchableComboboxProps<
	T extends SelectableItem,
	Q extends PaginatedQuery,
> = SingleSearchableComboboxProps<T, Q> | MultipleSearchableComboboxProps<T, Q>;

function DefaultComboboxTrigger<T extends SelectableItem>({
	id,
	className,
	value,
	placeholder,
}: {
	id?: string;
	className?: string;
	value?: T | T[];
	placeholder?: string;
}) {
	const displayValue = Array.isArray(value)
		? value.map((item) => item.name).join(", ")
		: value?.name;

	return (
		<ComboboxTrigger id={id} className={cn("w-full", className)}>
			{displayValue || (placeholder ?? "Select")}
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

	const selectedItemsMap = React.useMemo(() => {
		if (!value) return new Map<string, T>();
		if (Array.isArray(value)) {
			return new Map(value.map((item) => [item._id, item]));
		}
		return new Map([[value._id, value]]);
	}, [value]);

	const isMultiple = props.type === "multiple";

	const handleItemSelect = (item: T | undefined) => {
		if (!item) {
			if (isMultiple) {
				props.onItemSelectChange([]);
			} else {
				props.onValueChange(undefined);
			}
			return;
		}

		if (isMultiple) {
			const newValue = [...(props.value || [])];
			const index = newValue.findIndex((i) => i._id === item._id);
			if (index > -1) {
				newValue.splice(index, 1);
			} else {
				newValue.push(item);
			}
			props.onItemSelectChange(newValue);
		} else {
			if (props.value?._id === item._id) {
				props.onValueChange(undefined);
			} else {
				props.onValueChange(item);
			}
		}
	};

	return (
		<Combobox
			selectedItems={selectedItemsMap}
			onValueChange={handleItemSelect}
			onPopoverOpenChange={(open) => {
				if (!open) {
					setTimeout(() => {
						setSearch("");
					}, 100);
				}
			}}
		>
			<Trigger
				id={id}
				className={cn("w-full", className)}
				value={value as any}
				placeholder={placeholder}
			/>
			<ComboboxContent>
				<SearchableComboboxContent
					selectedItems={selectedItemsMap}
					apiQuery={apiQuery}
					search={search}
					setSearch={setSearch}
					searchPlaceholder={searchPlaceholder}
					queryArgs={queryArgs}
					onSelect={onSelect}
					onItemSelect={handleItemSelect}
					closeOnSelect={!isMultiple}
				/>
			</ComboboxContent>
		</Combobox>
	);
}

type SearchableComboboxContentProps<
	T extends SelectableItem,
	Q extends PaginatedQuery,
> = {
	selectedItems: Map<string, T>;
	apiQuery: Q;
	search: string;
	setSearch: (search: string) => void;
	searchPlaceholder?: string;
	queryArgs?: OptionalRestArgs<Q>[0];
	onSelect?: (name: string) => void;
	onItemSelect: (item: T) => void;
	closeOnSelect?: boolean;
};

function SearchableComboboxContent<
	T extends SelectableItem,
	Q extends PaginatedQuery,
>({
	selectedItems,
	apiQuery,
	search,
	setSearch,
	searchPlaceholder,
	queryArgs,
	onSelect,
	onItemSelect,
	closeOnSelect = true,
}: SearchableComboboxContentProps<T, Q>) {
	const { setIsOpen } = useComboboxContext<T>();

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
		onItemSelect(item);
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
				const [entry] = entries;
				if (entry.isIntersecting) {
					loadMore(2);
				}
			},
			{
				root: scrollAreaRef.current,
				threshold: 0.1,
			},
		);

		observer.observe(loaderRef.current);

		return () => observer.disconnect();
	}, [status, loadMore]);

	return (
		<>
			<ComboboxInput
				placeholder={searchPlaceholder ?? "Search..."}
				value={search}
				onValueChange={setSearch}
			/>
			<ComboboxList>
				<CommandGroup>
					<ScrollArea ref={scrollAreaRef} className="h-[200px]">
						{items?.map((item) => (
							<CommandItem
								key={item._id}
								value={item.name}
								onSelect={() => handleSelectItem(item as T)}
							>
								{item.name}
								<Check
									className={cn(
										"ml-auto",
										selectedItems.has(item._id) ? "opacity-100" : "opacity-0",
									)}
								/>
							</CommandItem>
						))}
						{status === "CanLoadMore" && (
							<div ref={loaderRef} className="h-4 w-full" />
						)}
					</ScrollArea>
				</CommandGroup>
				{/* TODO: I think this should be based on backend results, if it is empty, show this option */}
				{onSelect &&
					search.length > 0 &&
					!items.find(
						(item) => item.name.toLowerCase() === search.toLowerCase(),
					) && (
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
