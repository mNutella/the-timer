# The Timer

Precision time tracking for macOS. Built for freelancers and consultants who want to track billable hours, manage clients, and generate invoices — all from a native desktop app.

Currently in **beta**.

## What it does

- **Track time** with a one-click timer. Attach entries to clients, projects, and categories.
- **Dynamic Island overlay** — a floating widget that stays accessible while you work (macOS).
- **Manage clients & projects** with per-client rates and project associations.
- **Generate invoices** from tracked time with customizable grouping (by client, project, category, or entry).
- **Analytics dashboard** — charts and breakdowns of where your time goes.
- **Real-time sync** — everything stays in sync across the app via Convex.

## Tech stack

| Layer | Tech |
|-------|------|
| Desktop | [Tauri v2](https://tauri.app) with NSPanel for Dynamic Island |
| Frontend | React 18, TypeScript, TanStack Router, Tailwind CSS v4 |
| UI | Radix primitives, Recharts, cmdk |
| Backend | [Convex](https://convex.dev) (real-time database + auth) |
| Auth | OAuth (Google) via `@convex-dev/auth` |

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org) 18+
- [pnpm](https://pnpm.io)
- [Rust](https://rustup.rs) (for Tauri — macOS requires Xcode Command Line Tools)
- A [Convex](https://convex.dev) account (free tier works)

### Setup

```bash
git clone https://github.com/mNutella/the-timer.git
cd the-timer
pnpm install
```

Copy the env template and fill in your Convex deployment:

```bash
cp .env.example .env.local
```

Then set up Convex:

```bash
npx convex dev
```

### Run

**Web only** (for frontend development):

```bash
pnpm dev
```

**Full desktop app**:

```bash
pnpm tauri dev
```

### Build

```bash
pnpm tauri build
```

This produces a `.app` bundle in `src-tauri/target/release/bundle/`.

### Tests

```bash
pnpm test        # watch mode
pnpm test:run    # single run
```

## Project structure

```
src/               React frontend
  routes/(app)/    Pages — dashboard, clients, projects, invoices, analytics, settings
  components/      UI components and dashboard widgets
  hooks/           Custom hooks (timer, filters, analytics)
  overlay/         Dynamic Island floating window
  lib/             Types, utils, settings

convex/            Backend
  schema.ts        Data model
  model/           Business logic
  *.ts             API queries and mutations

src-tauri/         Tauri (Rust)
  src/main.rs      Native window management, tray, Dynamic Island
```

## License

[MIT](LICENSE)
