# Lessons Learned

## convex-helpers/react/cache useQuery — stale data on arg transitions
**Date:** 2026-02-25
**Context:** Invoice preview query toggling `mergeEntries` on/off showed stale rows from the previous query result.

**Root cause:** `convex-helpers/react/cache` `useQuery` wraps Convex's `useQueriesCore` with a fixed record key `_default`. When args change, the subscription transitions can return stale data — the old DOM rows persist alongside new ones. The totals (computed from `lineItems.reduce`) were correct (from the new query), but the table rendered extra rows from the previous query.

**Fix:**
1. Use standard `useQuery` from `convex/react` for queries where args change frequently (toggles, filters)
2. Add a `key` prop to the preview component based on the changing args — forces React to unmount/remount cleanly

**Rule:** For reactive queries where the user frequently toggles args (filters, grouping, merge), prefer the standard `useQuery` over the cached version. The cache is better for stable queries (lists, single records) that don't change args often.
