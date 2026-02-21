# Testing TODO - The Timer

Prioritized test plan. Tests verify **behavior through public interfaces** — not implementation details. Each item describes _what_ the system should do, not how it does it internally.

**Current coverage:** 105 tests (82 backend integration, 23 frontend unit)

---

## Tier 1: Export Utility (Pure Functions, Zero Tests)

`src/lib/export.ts` — 400 lines of pure logic with no test coverage. Easy to test, directly user-facing.

### 1.1 Detailed CSV export
- [x] Generates correct CSV headers (Name, Client, Project, Category, Date, Start Time, End Time, Duration, Notes)
- [x] Formats each entry as a CSV row with correct field mapping
- [x] Running entries (no end_time) show "In Progress" for end time
- [x] Entries without client/project/category show empty strings
- [x] Entries sort by start_time descending (newest first)

### 1.2 Detailed CSV with grouping
- [x] Grouping by client sorts entries by client name, then by date within each group
- [ ] Grouping by project/category/date follows the same pattern

### 1.3 Summary export
- [x] Groups entries by client and sums durations
- [x] Groups entries by project/category/date
- [x] Outputs Group, Total Duration, Total Hours (decimal), Entry Count
- [x] Entries without a group key show "(No Client)" / "(No Project)" etc.
- [x] Groups sort alphabetically by name

### 1.4 Merged export
- [x] Merges entries with same name+client+project+category into one row
- [ ] Totals duration and counts entries per merged group
- [x] When grouped by date, key includes date — same-name entries on different days stay separate
- [x] Sorts by group dimension, then by total duration descending within each group

### 1.5 CSV escaping
- [x] Fields with commas are quoted
- [x] Fields with double quotes are escaped (doubled)
- [x] Fields with newlines are quoted
- [x] Normal fields are not quoted

### 1.6 JSON export
- [x] Detailed JSON includes exportedAt, totalEntries, mode, groupBy, and entries array
- [x] Summary JSON includes groups array with name, totalDuration, totalHours, entryCount
- [x] Merged JSON includes entries array with merged totals

### 1.7 Filename generation
- [x] Generates filename with mode, groupBy suffix, current date, and format extension
- [x] No groupBy suffix when groupBy is "none"

---

## Tier 2: Analytics Queries (Complex Backend, Zero Tests)

`convex/model/analytics.ts` + `convex/time_entries.ts` query handlers — 1000 lines of aggregate logic with zero test coverage. These power the entire analytics page.

### 2.1 Daily duration time series (`getDailyDurations`)
- [ ] Returns one entry per day in the date range with date string and duration
- [ ] Sums duration correctly from aggregate for each day
- [ ] Returns 0 duration for days with no entries
- [ ] Filters by client IDs — only counts entries for those clients
- [ ] Filters by project IDs — only counts entries for those projects
- [ ] Filters by category IDs — only counts entries for those categories

### 2.2 Total duration (`getTotalDuration`)
- [ ] Returns total ms across all entries in date range
- [ ] Filters by client — sums only matching client entries
- [ ] Filters by multiple clients — sums across all specified clients
- [ ] Filters by project/category follow same pattern
- [ ] Returns 0 when no entries exist in range

### 2.3 Entity breakdown (`getEntityBreakdown`)
- [ ] Returns duration per client within date range, sorted by duration descending
- [ ] Returns duration per project within date range
- [ ] Returns duration per category within date range
- [ ] Includes "No Client" / "No Project" / "Uncategorized" bucket for unassigned entries
- [ ] Omits entities with 0 duration
- [ ] Specific entityIds filter — only returns those entities
- [ ] Cross-dimensional filters (e.g., breakdown by client, filtered by specific project) — uses entry-level query path

### 2.4 Category breakdown (`getCategoryBreakdown`)
- [ ] Returns duration per category within date range
- [ ] Includes "Uncategorized" for entries without a category
- [ ] Filtered by clientIds — only counts entries for those clients
- [ ] Filtered by projectIds — only counts entries for those projects

### 2.5 Daily duration breakdown (`getDailyDurationBreakdown`)
- [ ] Returns per-entity breakdown for each day in range
- [ ] Fast path: uses aggregates when no cross-filters
- [ ] Slow path: queries entries when cross-dimensional filters exist

---

## Tier 3: Search & Filter Queries (Complex, Zero Tests)

`convex/model/time_entries.ts` `buildFilteredQuery` and `searchTimeEntries` — the core paginated query that powers the table.

### 3.1 Paginated search
- [x] Returns paginated time entries with cursor-based pagination
- [x] No filters — returns all entries for user ordered by start_time desc
- [ ] Name filter — matches entries containing the search string (case-insensitive via search index)

### 3.2 Multi-select entity filters
- [x] Single client filter — returns only entries for that client
- [x] Multiple client filter — returns entries for any of the specified clients
- [x] Project filter — works the same as client filter
- [x] Category filter — works the same as client filter
- [ ] Combined client + project filter — returns entries matching both

### 3.3 Date range filter
- [x] Date range — returns entries with start_time within the range
- [ ] Start of day / end of day boundaries are inclusive

### 3.4 Edge resolution (include)
- [x] `include.client: true` resolves client edge to { _id, name } or null
- [x] `include.project: true` resolves project edge
- [ ] `include.category: true` resolves category edge

### 3.5 Export query (`exportTimeEntries`)
- [x] Returns all (non-paginated) time entries matching filters
- [x] Resolves client/project/category edges for each entry

---

## Tier 4: Entity CRUD Model Layer (Newly Extracted, Untested)

`convex/model/clients.ts`, `convex/model/projects.ts`, `convex/model/categories.ts` — extracted during refactoring, tested only indirectly through API-level tests.

### 4.1 Client model
- [ ] Create client with name and userId
- [ ] Update client name
- [ ] Delete client nullifies clientId on associated time entries
- [ ] Delete client nullifies clientId on associated projects
- [ ] Ownership validation on update/delete

### 4.2 Project model
- [ ] Create project with name, userId, optional clientId, default status "active"
- [ ] Update project name
- [ ] Delete project nullifies projectId on associated time entries
- [ ] Ownership validation on update/delete

### 4.3 Category model
- [ ] Create category with name and userId
- [ ] Update category name
- [ ] Delete category nullifies categoryId on associated time entries
- [ ] Ownership validation on update/delete

### 4.4 Entity list/search queries
- [ ] `clients.list` returns all clients for user with total hours from aggregates
- [x] `clients.searchByName` returns paginated results matching search text
- [x] `clients.searchByName` isolates results per user
- [x] `projects.searchByName` returns paginated results matching search text
- [x] `projects.searchByName` supports filtering by clientId
- [x] `categories.searchByName` returns paginated results matching search text
- [x] `projects.update` changes name and status
- [x] `categories.update` changes name
- [ ] `projects.list` supports filtering by clientId (requires aggregates)

---

## Tier 5: Helpers & Utilities (Small but Important)

### 5.1 `assertOwnership` (`convex/model/helpers.ts`)
- [x] Throws when entity.userId !== userId
- [x] Does not throw when entity.userId === userId
- [x] Error message includes entity type name

### 5.2 `applyOrFilter` (`convex/model/helpers.ts`)
- [ ] Returns query unchanged when ids array is empty
- [ ] Applies single-ID filter
- [ ] Applies multi-ID OR filter

---

## Tier 6: Frontend Utilities (Expand Existing Coverage)

### 6.1 `withToast` (`src/lib/utils.ts`)
- [ ] Calls mutation with provided args
- [ ] Shows loading toast, then success toast on resolve
- [ ] Shows error toast on rejection

### 6.2 `useFilters` hook (`src/hooks/use-filters.ts`)
- [ ] Initial state: all filters empty/undefined
- [ ] Setting search value updates filter state
- [ ] Setting client/project/category arrays updates filter state
- [ ] Setting date range updates filter state
- [ ] Clear resets all filters to initial state
- [ ] Returns stable references (doesn't cause unnecessary re-renders)

---

## Not Planned (and Why)

### React component tests
Not included because the app has no component testing infrastructure (no @testing-library/react, no jsdom). Setting that up is a separate effort. The components are thin wrappers around Convex queries + shadcn/ui — testing them would mostly test the UI library, not business logic.

### Tauri desktop features
System tray, global hotkeys, and NSPanel are native Rust code. Testing them requires Tauri's test harness or E2E tools (WebDriver), which is a different test suite entirely.

### Aggregate trigger registration
Triggers in `convex/functions.ts` are already tested indirectly — every time a backend test creates/updates/deletes a time entry, the triggers fire and maintain aggregate state. The analytics tests (Tier 2) would fail if triggers were broken.

---

## Implementation Notes

### Test file locations
- Backend: `convex/<module>.test.ts` (co-located with module)
- Frontend: `src/<path>/<module>.test.ts` (co-located with source)

### Seed helpers available
`convex/setup.testing.ts` provides: `createTest()`, `seedUser()`, `seedClient()`, `seedProject()`, `seedCategory()`, `seedTimeEntry()`

### Running tests
```bash
pnpm test        # Watch mode
pnpm test:run    # Single run (CI)
```

### TDD approach
Work in vertical slices: one test → make it pass → next test. Do NOT write all tests for a tier before implementing. Each test responds to what you learned from the previous cycle.

### Priority recommendation
Start with **Tier 1** (export utility) — pure functions, no backend setup needed, fastest feedback loop. Then **Tier 2** (analytics) — highest risk area with complex logic and zero coverage. **Tier 3** (search/filter) fills the remaining critical backend gap.
