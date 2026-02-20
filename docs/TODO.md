# TODO - The Timer

Prioritized task list based on current project state. Focused on reaching a fully workable time tracking app with Excel export.

---

## Phase 1: Core Fixes & Completions (High Priority)

These items fix existing broken/incomplete features that block a usable app.

- [x] **Fix SectionCards** - Replaced with timer-focused daily dashboard (active timer widget, today summary cards, quick start, activity feed)
- [x] **Connect analytics charts to real data** - Bar chart and radial chart wired to aggregate queries with active filters
- [x] **Fix searchable combobox bug** - Selected value no longer populates the search input
- [x] **Add quick date range presets** - Today, This Week, This Month, Last Month buttons alongside custom range picker

---

## Phase 2: Excel Export (Key Feature)

The main missing feature - ability to export filtered time entries to Excel.

- [ ] **Add xlsx library** - Install `exceljs` or `xlsx` package
- [ ] **Create export utility** - Build `src/lib/export.ts` with functions to:
  - Format time entries for export
  - Generate Excel workbook with headers, data rows, and summary
  - Apply professional formatting (column widths, bold headers, date formats)
- [ ] **Add "Export to Excel" button** - Place in table toolbar (next to filters)
- [ ] **Implement filtered export** - Export only entries matching current filters (client, project, category, date range, search)
- [ ] **Add summary sheet** - Totals by client, project, and category
- [ ] **Tauri file save dialog** - Use native OS file picker for save location
- [ ] **Add export to analytics page** - Export button on analytics page as well

---

## Phase 3: Table Enhancements

Improve the time entries table for daily usability.

- [x] **Column sorting** - Sort by date, duration, name, client, project (click column header)
- [x] **Row selection** - Checkbox column for selecting multiple entries
- [x] **Bulk actions** - Delete selected, export selected, change client/project for selected
- [x] **Duplicate entry** - Quick action to copy a time entry
- [x] **Description/notes UI** - Expandable row or modal to edit description and notes fields

---

## Phase 4: Tag Support

Tags are fully defined in the schema and backend but have no UI.

- [ ] **Tag cell in table** - Display tags as colored chips in time entries
- [ ] **Tag editing** - Add/remove tags from time entries via combobox
- [ ] **Tag filter** - Add tag filter to filter bar
- [ ] **Tag management** - Basic CRUD for tags (name, color)

---

## Phase 5: Entity Management Pages

Currently clients/projects/categories can only be created inline. Dedicated pages needed.

- [x] **Clients page** - List all clients, edit name, delete (with confirmation), view total hours
- [x] **Projects page** - List projects, filter by client, edit, archive/complete, view total hours
- [x] **Categories page** - List categories, edit, delete
- [ ] **Tags page** - List tags, edit name/color, delete
- [x] **Add navigation items** - Add sidebar links for these pages

---

## Phase 6: Authentication

Replace hardcoded user ID with real auth flow.

- [ ] **Login page** - Email/password form with validation
- [ ] **Auth middleware** - Protect routes, redirect to login if unauthenticated
- [ ] **Session management** - Token storage and auto-refresh
- [ ] **Logout** - Clear session, redirect to login
- [ ] **Settings page** - Update profile name/email, change password

---

## Phase 7: Desktop Features (Tauri)

Leverage Tauri for native desktop experience.

- [ ] **System tray icon** - Show timer status (running/stopped)
- [ ] **Tray menu** - Quick start/stop, recent entries
- [ ] **Global hotkey** - Start/stop timer from anywhere (e.g., Cmd+Shift+T)
- [ ] **Native notifications** - Alert when timer runs > configurable threshold
- [x] **Mini timer window** - Always-on-top Dynamic Island overlay near MacBook notch
- [ ] **Auto-start** - Optional launch on system boot

---

## Phase 8: Polish & Nice-to-Haves

- [ ] **Saved filter presets** - Save and load named filter combinations
- [ ] **Column reordering** - Drag columns to reorder
- [ ] **Keyboard shortcuts** - Start/stop timer, navigate table, open filters
- [ ] **Confirmation dialogs** - Before delete actions
- [ ] **Undo delete** - Toast with undo action after deleting entry
- [ ] **Idle detection** - Detect when user is idle and prompt to stop timer
- [ ] **Weekly/monthly reports** - Pre-built report views
- [ ] **CSV export** - Alternative to Excel for simpler needs

---

## Completed Features

For reference, these are already implemented and working:

- [x] Timer start/stop with live duration
- [x] Auto-stop previous timer on new start
- [x] Resume time entries
- [x] Time entry CRUD (create, read, update, delete)
- [x] Inline editing: name, client, project, category, duration, start/end time
- [x] Client/project/category creation inline
- [x] Searchable combobox with pagination
- [x] Project filtering by client
- [x] Time entry search
- [x] Client/project/category/date range filters
- [x] Shared filter state between dashboard and analytics
- [x] Virtualized table with infinite scroll
- [x] Column visibility customization
- [x] Analytics aggregates via triggers (4 aggregate types)
- [x] Bar chart and radial chart components
- [x] Responsive sidebar layout
- [x] Dark mode
- [x] Toast notifications
- [x] Prevention of updates to deleted entries
- [x] Multiselect entity filters (client, project, category)
- [x] Selected items shown first in filter dropdowns
- [x] Analytics charts connected to real filtered data (bar + radial)
- [x] Combobox search input cleared on selection
- [x] Dynamic Island overlay with NSPanel, JS-driven state animations
- [x] Native CALayer corner masking to prevent border-radius flash during resize
- [x] NSPanel focus swizzling for inline editing in overlay
- [x] Entity management pages (Clients, Projects, Categories) with list/edit/delete
- [x] Sidebar "Manage" section with navigation links
- [x] Delete confirmation dialogs for entity management
- [x] Total hours via aggregates on entity management pages
- [x] Project status management (active/archived/completed) with badge dropdown
- [x] Project filtering by client on management page
