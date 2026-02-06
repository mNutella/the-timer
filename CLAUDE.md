# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development - run frontend and Convex backend concurrently
pnpm dev              # Vite dev server on port 1420
npx convex dev        # Convex backend (separate terminal)

# Tauri desktop app
pnpm tauri dev        # Run as native desktop app (starts Vite internally)
pnpm tauri build      # Build desktop binary

# Build & type check
pnpm build            # tsc && vite build

# Formatting & linting (Biome, not ESLint)
npx @biomejs/biome check .              # Check all
npx @biomejs/biome check --write .      # Auto-fix
npx @biomejs/biome format --write .     # Format only
```

## Code Style

- **Formatter:** Biome with tabs, double quotes
- **Path alias:** `@/` maps to `./src/*`
- **CSS:** Tailwind CSS v4 (no tailwind.config — uses `@tailwindcss/vite` plugin)
- **Components:** Shadcn/ui style with Radix UI primitives and `class-variance-authority`

## Architecture

### Stack
- **Frontend:** React 18 + TypeScript, TanStack Router (file-based routing), TanStack Table (virtualized), TanStack Query
- **Backend:** Convex (serverless DB + real-time functions), `convex-ents` (entity framework), `convex-helpers`
- **Desktop:** Tauri 2 (Rust shell)
- **Charts:** Recharts

### Backend (`convex/`)

**Custom function wrappers** — all queries/mutations use wrapped versions from `convex/functions.ts`, NOT raw Convex functions. These inject `convex-ents` table access and trigger support:
```ts
import { query, mutation } from "./functions";  // NOT from "./_generated/server"
```

**Entity types** are in `convex/types.ts`: `QueryCtx`, `MutationCtx`, `Ent<T>`, `EntWriter<T>`, `EntQuery<T>`.

**Schema** (`convex/schema.ts`) uses `convex-ents` (`defineEnt`/`defineEntSchema`). Entities: `users`, `clients`, `projects`, `time_entries`, `categories`, `tags`. Relationships are defined via `.edge()` (singular) and `.edges()` (plural).

**Business logic separation** — API layer in `convex/time_entries.ts` (thin mutation/query handlers) delegates to `convex/model/time_entries.ts` (business logic) and `convex/model/analytics.ts` (aggregate queries).

**Aggregates** (`convex/aggregates.ts`) — uses `@convex-dev/aggregate` `TableAggregate` for pre-computed analytics (total duration by date, by client+date, by project+date, by category+date). Registered as Convex components in `convex.config.ts`. Maintained via triggers in `convex/functions.ts`.

**No auth yet** — user ID is passed from frontend via `import.meta.env.VITE_USER_ID`. All mutations take `userId` as an explicit parameter.

### Frontend (`src/`)

**Routing** — TanStack Router with file-based routes in `src/routes/`. Layout route at `(app)/` wraps pages with sidebar. Auto code-splitting enabled.

**Provider chain** — `src/router.tsx` sets up `ConvexProvider` > `ConvexQueryCacheProvider` > Router. Convex URL from `VITE_CONVEX_URL` env var.

**Frontend types** (`src/lib/types.ts`) — `TimeEntry`, `Client`, `Project`, `Category`, `Tags` are all derived from the paginated query return type, ensuring backend-frontend type alignment.

**Time entries table** (`src/components/time-entries-table/`) — virtualized table using TanStack Table + TanStack Virtual. `hooks.ts` contains all mutation hooks (`useUpdateTimeEntryName`, `useUpdateTimeEntryClient`, `useStartStopTimeEntry`, etc.) and the main `useTimeEntries` paginated query hook. Each cell type is a separate component with inline editing.

**Filter state** — `src/hooks/use-filters.ts` exports `useFilters()` managing search, client, project, category, and date range filters. Shared between dashboard and analytics pages.

**Combobox pattern** — `SearchableCombobox` and `ComboboxInfinity` handle entity selection with server-side search, pagination, and on-the-fly creation (pass `newClientName`/`newProjectName`/`newCategoryName` to mutations).

**Toast pattern** — mutations are wrapped with `withToast()` from `src/lib/utils.ts` for loading/success/error notifications via Sonner.

### Key Patterns

- **Pagination:** Uses `useStablePaginatedQuery` (custom hook wrapping Convex's paginated query) with `initialNumItems: 10` and intersection observer for infinite scroll.
- **Duration:** Stored as milliseconds in DB. Displayed as `HH:MM:SS`. Parsed via `parseDurationToMilliseconds()` from `src/lib/utils.ts`.
- **Timer:** A running timer = time entry with `start_time` set, `end_time` undefined. Starting a new timer auto-stops any running one. Resume creates a new entry copying metadata from the original.
- **Client→Project cascading:** When a time entry's client changes, the project is cleared if it belonged to a different client.

## Environment Variables

```
VITE_CONVEX_URL=      # Convex deployment URL
VITE_USER_ID=         # Hardcoded user ID (temporary, no auth yet)
```
