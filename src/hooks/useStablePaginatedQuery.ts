import { usePaginatedQuery } from "convex-helpers/react/cache";
import type { FunctionArgs, FunctionReference } from "convex/server";
import * as React from "react";

type PaginatedQueryRef = FunctionReference<
	"query",
	"public",
	{ paginationOpts: { numItems: number; cursor: string | null } } & Record<string, unknown>,
	{
		page: unknown[];
		isDone: boolean;
		continueCursor: string;
	}
>;

export function useStablePaginatedQuery<
	TItem,
	TQuery extends PaginatedQueryRef = PaginatedQueryRef,
>(
	apiQuery: TQuery,
	queryArgs: Omit<FunctionArgs<TQuery>, "paginationOpts">,
	options?: { initialNumItems?: number },
) {
	const { results, loadMore, isLoading, status } = usePaginatedQuery(
		apiQuery,
		// biome-ignore lint/suspicious/noExplicitAny: convex-helpers expects a widened arg type
		queryArgs as any,
		{ initialNumItems: options?.initialNumItems ?? 10 },
	);

	const dataRef = React.useRef<TItem[] | undefined>(undefined);

	if (!isLoading && results && results !== dataRef.current) {
		dataRef.current = results as TItem[];
	}

	return {
		results: (dataRef.current ?? (results as TItem[])) as TItem[],
		loadMore,
		isLoading,
		status,
	};
}
