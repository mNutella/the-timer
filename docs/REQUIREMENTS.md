# Requirements - The Timer

A fully workable time tracking desktop application built with Tauri + React + Convex, with the ability to export hours based on filters to Excel.

## Tech Stack

- **Frontend:** React 18, TypeScript, TanStack Router/Table/Query, Tailwind CSS, Radix UI
- **Backend:** Convex (serverless DB + functions), convex-ents, convex-helpers
- **Desktop:** Tauri 2
- **Charts:** Recharts
- **Export:** Excel export (xlsx)

---

## 1. Authentication & User Management

### 1.1 User Authentication
- [ ] Login page with email/password
- [ ] Session management / token persistence
- [ ] Logout functionality
- [ ] Password hashing (bcrypt or argon2 - schema has `password_hash`)

### 1.2 User Profile
- [ ] Settings page to update name/email
- [ ] Password change

> **Current state:** User ID is hardcoded via `.env.local`. No auth flow exists yet.

---

## 2. Timer & Time Entry Management (Core)

### 2.1 Timer
- [x] Start a new time entry (creates entry with `start_time`, no `end_time`)
- [x] Stop a running timer (sets `end_time` and computes `duration`)
- [x] Auto-stop previous timer when starting a new one
- [x] Live duration display that updates every second while running
- [x] Resume a stopped time entry (creates new entry copying metadata)
- [ ] Timer notification when running longer than X minutes (configurable)
- [ ] Desktop tray / always-on-top mini timer widget

### 2.2 Time Entry CRUD
- [x] Create time entries
- [x] Edit time entry name (inline)
- [x] Edit time entry duration (HH:MM:SS format)
- [x] Edit start/end times
- [x] Delete time entries
- [x] Assign client, project, category to time entry
- [x] Toast notifications on mutations (success/error)
- [ ] Bulk delete time entries
- [ ] Duplicate a time entry
- [ ] Add/edit description and notes (fields exist but no UI)
- [ ] Tag support in UI (schema and backend exist, UI not implemented)

### 2.3 Time Entry Validation
- [x] Prevent updates to deleted time entries
- [ ] Validate that end_time > start_time
- [ ] Validate duration matches start/end time range
- [ ] Prevent overlapping time entries (optional)

---

## 3. Client / Project / Category / Tag Management

### 3.1 Clients
- [x] Create clients inline from time entry combobox
- [x] Search clients with pagination
- [ ] Dedicated client management page (list, edit, delete)
- [ ] Client details view

### 3.2 Projects
- [x] Create projects inline (optionally linked to client)
- [x] Search projects with pagination
- [x] Filter projects by selected client
- [ ] Project status management (active/archived/completed)
- [ ] Dedicated project management page (list, edit, delete)
- [ ] Project details view with time summary

### 3.3 Categories
- [x] Create categories inline from time entry combobox
- [x] Search categories with pagination
- [ ] Dedicated category management page

### 3.4 Tags
- [x] Schema and backend support
- [ ] Tag UI in time entries table
- [ ] Tag color support
- [ ] Tag management page
- [ ] Filter by tags

---

## 4. Filtering & Search

### 4.1 Time Entry Filters
- [x] Search by time entry name
- [x] Filter by client
- [x] Filter by project
- [x] Filter by category
- [x] Date range filter (from/to)
- [x] Filters shared between dashboard table and analytics
- [ ] Filter by tags
- [ ] Save/load filter presets
- [ ] Quick date ranges (Today, This Week, This Month, Last Month, Custom)

### 4.2 Table Features
- [x] Virtualized scrolling for performance
- [x] Infinite scroll pagination (10 initial, 5 more per load)
- [x] Column visibility customization
- [ ] Column sorting (by date, duration, name, client, project)
- [ ] Column reordering
- [ ] Row selection for bulk actions

---

## 5. Analytics & Reporting

### 5.1 Dashboard Stats
- [x] Total duration card (functional)
- [ ] Total entries count card
- [ ] Active projects count card
- [ ] Average daily hours card
- [ ] Stats should respect active filters

### 5.2 Charts
- [x] Bar chart component (time entries by date)
- [x] Radial stacked chart component
- [ ] Connect charts to real filtered data (currently partially placeholder)
- [ ] Time breakdown by client (pie/donut chart)
- [ ] Time breakdown by project
- [ ] Time breakdown by category
- [ ] Daily/weekly/monthly trend line
- [ ] Interactive chart tooltips with drill-down

### 5.3 Aggregations (Backend)
- [x] Total duration by date aggregate
- [x] Total duration by client and date aggregate
- [x] Total duration by project and date aggregate
- [x] Total duration by category and date aggregate
- [x] Triggers maintain aggregates on create/update/delete

---

## 6. Excel Export (Key Feature)

### 6.1 Export Functionality
- [ ] Export filtered time entries to `.xlsx` file
- [ ] Export should respect all active filters (client, project, category, date range, search)
- [ ] Configurable columns in export (name, client, project, category, duration, start/end time, date, notes)
- [ ] Duration formatted as hours (decimal) and/or HH:MM:SS
- [ ] Summary sheet with totals by client/project/category
- [ ] Date grouping in export (daily/weekly/monthly summaries)
- [ ] File save dialog via Tauri (native OS file picker)
- [ ] Export button in table toolbar and analytics page

### 6.2 Export Format
- Column headers: Date, Entry Name, Client, Project, Category, Start Time, End Time, Duration (h), Notes
- Rows sorted by date (newest first) or configurable
- Summary section at bottom or separate sheet with:
  - Total hours
  - Hours per client
  - Hours per project
  - Hours per category
- Professional formatting (bold headers, column widths, date formatting)

---

## 7. UI/UX

### 7.1 Layout
- [x] Collapsible sidebar navigation
- [x] Responsive design with mobile sidebar
- [x] Dark mode support
- [x] Dynamic page titles

### 7.2 Navigation
- [x] Dashboard page
- [x] Analytics page
- [ ] Settings page (placeholder exists)
- [ ] Client management page
- [ ] Project management page

### 7.3 Inline Editing
- [x] Time entry name editing
- [x] Client selection via searchable combobox
- [x] Project selection (respects client filter)
- [x] Category selection via searchable combobox
- [x] Duration editing (HH:MM:SS)
- [x] Start/end time editing

### 7.4 Desktop Features (Tauri)
- [ ] System tray with timer status
- [ ] Global keyboard shortcut to start/stop timer
- [ ] Native notifications for long-running timers
- [ ] Always-on-top mini timer window
- [ ] Auto-start on system boot (optional)

---

## 8. Known Issues to Fix

- [ ] Rapid client/project changes can cause data inconsistency
- [ ] Searchable combobox adds selected value to search input (should not)
- [ ] SectionCards display hardcoded sample data (3 of 4 cards)
- [ ] Analytics charts not fully connected to filtered real-time data
- [ ] Tags UI not implemented despite backend support

---

## 9. Non-Functional Requirements

- **Performance:** Virtual scrolling for 1000+ entries, aggregate-based analytics
- **Reliability:** Optimistic updates with error rollback, toast feedback
- **Offline:** Consider offline support via Tauri local storage (future)
- **Data Safety:** Confirmation dialog before deleting entries
- **Accessibility:** Keyboard navigation in comboboxes and table
