import { usePaginatedQuery, useQuery } from "convex-helpers/react/cache";
import type { FunctionArgs, FunctionReference } from "convex/server";

type PaginatedQueryRef = FunctionReference<
  "query",
  "public",
  { paginationOpts: { numItems: number; cursor: string | null } } & Record<
    string,
    unknown
  >,
  {
    page: unknown[];
    isDone: boolean;
    continueCursor: string;
  }
>;

type CountQueryRef = FunctionReference<
  "query",
  "public",
  Record<string, unknown>,
  number
>;

export function useInfiniteQuery<
  T extends PaginatedQueryRef,
  C extends CountQueryRef | undefined = undefined
>(
  apiQuery: T,
  queryArgs: Omit<FunctionArgs<T>, "paginationOpts">,
  options?: {
    initialNumItems?: number;
    countQuery?: C;
    countArgs?: Record<string, unknown>;
    deriveCountArgs?: (
      args: Omit<FunctionArgs<T>, "paginationOpts">
    ) => Record<string, unknown>;
  },
) {
  const { results, status, loadMore, isLoading } = usePaginatedQuery(
    apiQuery,
    // The helper's types are slightly incompatible with Convex's FunctionArgs
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    queryArgs as any,
    { initialNumItems: options?.initialNumItems ?? 10 },
  );

  const computedCountArgs =
    options?.deriveCountArgs?.(queryArgs) ?? options?.countArgs;

  const totalCount = useQuery(
    // Always call useQuery in a stable order; pass "skip" when no countQuery
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((options?.countQuery as any) ?? ("skip" as any)) as any,
    computedCountArgs as Record<string, unknown> | undefined,
  ) as number;

  return {
    results,
    status,
    loadMore,
    isLoading,
    totalCount,
  };
}
