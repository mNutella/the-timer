"use client";

import * as React from "react";
import { Check, PlusCircle } from "lucide-react";
import type { Id } from "convex/_generated/dataModel";

import type { FunctionReference, OptionalRestArgs } from "convex/server";
import {
	Combobox,
	ComboboxContent,
	ComboboxInput,
	ComboboxList,
	ComboboxTrigger,
} from "@/components/ui/combobox-infinity";
import { CommandGroup, CommandItem } from "@/components/ui/command";
import { useComboboxContext } from "@/components/ui/combobox-infinity/hooks";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useStablePaginatedQuery } from "@/hooks/useStablePaginatedQuery";

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

type SearchableComboboxProps<
	T extends SelectableItem,
	Q extends PaginatedQuery,
> = {
	id?: string;
	value?: T;
	className?: string;
	onValueChange: (item?: T) => void;
	apiQuery: Q;
	placeholder?: string;
	searchPlaceholder?: string;
	queryArgs?: OptionalRestArgs<Q>[0];
	onSelect?: (name: string) => void;
	comboboxTrigger?: React.ComponentType<{
		id?: string;
		className?: string;
		value?: T;
		placeholder?: string;
	}>;
};

function DefaultComboboxTrigger<T extends SelectableItem>({
	id,
	className,
	value,
	placeholder,
}: {
	id?: string;
	className?: string;
	value?: T;
	placeholder?: string;
}) {
	return (
		<ComboboxTrigger id={id} className={cn("w-full", className)}>
			{value?.name ?? placeholder ?? (
				<span className="text-muted-foreground">Select</span>
			)}
		</ComboboxTrigger>
	);
}

export function SearchableCombobox<
	T extends SelectableItem,
	Q extends PaginatedQuery,
>({
	id,
	value,
	className,
	onValueChange,
	apiQuery,
	placeholder,
	searchPlaceholder,
	queryArgs,
	onSelect,
	comboboxTrigger,
}: SearchableComboboxProps<T, Q>) {
	const [search, setSearch] = React.useState("");
	const Trigger = comboboxTrigger ?? DefaultComboboxTrigger;

	return (
		<Combobox
			value={value}
			onValueChange={onValueChange}
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
				value={value}
				placeholder={placeholder}
			/>
			<ComboboxContent>
				<SearchableComboboxContent
					value={value}
					apiQuery={apiQuery}
					search={search}
					setSearch={setSearch}
					searchPlaceholder={searchPlaceholder}
					queryArgs={queryArgs}
					onSelect={onSelect}
				/>
			</ComboboxContent>
		</Combobox>
	);
}

type SearchableComboboxContentProps<
	T extends SelectableItem,
	Q extends PaginatedQuery,
> = {
	value?: T;
	apiQuery: Q;
	search: string;
	setSearch: (search: string) => void;
	searchPlaceholder?: string;
	queryArgs?: OptionalRestArgs<Q>[0];
	onSelect?: (name: string) => void;
};

function SearchableComboboxContent<
	T extends SelectableItem,
	Q extends PaginatedQuery,
>({
	value,
	apiQuery,
	search,
	setSearch,
	searchPlaceholder,
	queryArgs,
	onSelect,
}: SearchableComboboxContentProps<T, Q>) {
	const { onValueChange, setIsOpen } = useComboboxContext<T>();

	// const {
	// 	results: items,
	// 	status,
	// 	loadMore,
	// } = usePaginatedQuery(
	// 	apiQuery,
	// 	{
	// 		...(queryArgs as any),
	// 		userId: import.meta.env.VITE_USER_ID as Id<"users">,
	// 		query: search.trim().toLowerCase(),
	// 	},
	// 	{ initialNumItems: 7 },
	// );
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
		onValueChange?.(item._id === value?._id ? undefined : item);
		setSearch("");
		setIsOpen(false);
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
										value?.name === item.name ? "opacity-100" : "opacity-0",
									)}
								/>
							</CommandItem>
						))}
						{status === "CanLoadMore" && (
							<div ref={loaderRef} className="h-4 w-full" />
						)}
					</ScrollArea>
				</CommandGroup>
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
