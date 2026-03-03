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

| Layer    | Tech                                                          |
| -------- | ------------------------------------------------------------- |
| Desktop  | [Tauri v2](https://tauri.app) with NSPanel for Dynamic Island |
| Frontend | React 19, TypeScript, TanStack Router, Tailwind CSS v4        |
| UI       | Radix primitives, Recharts, cmdk                              |
| Backend  | [Convex](https://convex.dev) (real-time database + auth)      |
| Auth     | OAuth (Google) via `@convex-dev/auth`                         |

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org) 18+
- [pnpm](https://pnpm.io)
- [Rust](https://rustup.rs) — only needed for desktop builds (macOS requires Xcode Command Line Tools)
- A [Convex](https://convex.dev) account (free tier works)
- A [Google Cloud](https://console.cloud.google.com) project for OAuth (see step 3 below)

### 1. Clone & install

```bash
git clone https://github.com/mNutella/the-timer.git
cd the-timer
pnpm install
```

### 2. Set up Convex

```bash
npx convex dev
```

This will prompt you to log in, create a new project, and automatically generate a `.env.local` file with your `CONVEX_DEPLOYMENT` and `VITE_CONVEX_URL`. Keep this running — it syncs your schema and functions to the dev deployment.

### 3. Configure Google OAuth

The app uses Google sign-in. Without this, authentication will silently fail.

1. Go to the [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create an **OAuth 2.0 Client ID** (application type: Web application)
3. Add the authorized redirect URI:

   ```
   https://<your-deployment-name>.convex.site/api/auth/callback/google
   ```

   Your deployment name is in `.env.local` — for example, if `VITE_CONVEX_URL` is `https://happy-animal-123.convex.cloud`, then the redirect URI is `https://happy-animal-123.convex.site/api/auth/callback/google`.

4. Set the credentials on your Convex deployment:
   ```bash
   npx convex env set AUTH_GOOGLE_ID <your-client-id>
   npx convex env set AUTH_GOOGLE_SECRET <your-client-secret>
   ```

### 4. Run

**Web only** (for frontend development):

```bash
pnpm dev
```

**Full desktop app** (requires Rust):

```bash
pnpm tauri dev
```

### Build

Desktop:

```bash
pnpm tauri build
```

This produces a `.app` bundle in `src-tauri/target/release/bundle/`.

Web:

```bash
pnpm build:web
```

### Tests

```bash
pnpm test        # watch mode
pnpm test:run    # single run
```

## Environment variables

| Variable             | Where                               | Purpose                                                                                      |
| -------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------- |
| `CONVEX_DEPLOYMENT`  | `.env.local` (auto-generated)       | Links local CLI to your Convex project                                                       |
| `VITE_CONVEX_URL`    | `.env.local` (auto-generated)       | Convex URL used by the frontend                                                              |
| `AUTH_GOOGLE_ID`     | Convex dashboard / `npx convex env` | Google OAuth client ID                                                                       |
| `AUTH_GOOGLE_SECRET` | Convex dashboard / `npx convex env` | Google OAuth client secret                                                                   |
| `JWKS`               | Convex dashboard (auto-generated)   | JWT verification keys — set automatically by `npx @convex-dev/auth`                          |
| `JWT_PRIVATE_KEY`    | Convex dashboard (auto-generated)   | JWT signing key — set automatically by `npx @convex-dev/auth`                                |
| `DEV_BYPASS_AUTH`    | Convex dashboard (dev only)         | Set to `"true"` to skip auth checks — useful when OAuth redirects can't reach your local app |

## Dev tips

- **Auth bypass for local development**: If you're working on non-auth features and can't complete the OAuth flow (e.g., deep-link redirects on desktop), set `DEV_BYPASS_AUTH=true` on your dev Convex deployment. This makes all queries/mutations use the first user in the database. Never use this in production.
- **Linting & formatting**: The project uses `oxlint` and `oxfmt`. Run `pnpm check` to lint, format-check, and type-check everything. Run `pnpm fmt` to auto-format.
- **Pre-commit hooks**: Managed by [Lefthook](https://github.com/evilmartians/lefthook). Install with `pnpm lefthook install` (runs automatically via `pnpm install`).

## LLM setup guide

> For AI coding assistants (Claude, Cursor, Copilot, etc.) helping a user set up this project.

### Quick start sequence

```bash
pnpm install
npx convex dev          # interactive — user must log in and create a project
```

`npx convex dev` generates `.env.local` automatically. Do **not** tell the user to copy `.env.example`.

### Auth setup (required — won't work without it)

Google OAuth credentials must be set as **Convex environment variables** (not in `.env.local`):

```bash
npx convex env set AUTH_GOOGLE_ID <value>
npx convex env set AUTH_GOOGLE_SECRET <value>
```

The OAuth redirect URI follows this pattern (note `.convex.site`, not `.convex.cloud`):

```
https://<deployment-name>.convex.site/api/auth/callback/google
```

The user must create these credentials at [Google Cloud Console > Credentials](https://console.cloud.google.com/apis/credentials). You cannot automate this step.

### Common auth failure

If `signIn` returns `{ signingIn: true }` but `isAuthenticated` stays `false`, the cause is almost always:

1. Missing `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` on the Convex deployment, or
2. Missing `convex/auth.config.ts` (must exist — configures JWT validation)

### Key architecture notes

- **Backend**: Convex functions live in `convex/`. Business logic is in `convex/model/`, API handlers are thin files at `convex/*.ts`. Schema is in `convex/schema.ts`.
- **Frontend**: React 19 + TanStack Router. Routes are in `src/routes/`. File-based routing — `src/routes/(app)/` contains all authenticated pages.
- **Auth**: `@convex-dev/auth` with Google provider. Auth config in `convex/auth.ts` and `convex/auth.config.ts`. HTTP callback routes registered in `convex/http.ts`.
- **Desktop**: Tauri v2 (Rust). Native code in `src-tauri/`. Only needed for `pnpm tauri dev` / `pnpm tauri build`.
- **Linting**: `oxlint` + `oxfmt` (not ESLint/Prettier for app code). Run `pnpm check` to validate. Convex-specific rules via ESLint scoped to `convex/`.
- **Dev auth bypass**: Set `DEV_BYPASS_AUTH=true` on the Convex deployment (via `npx convex env set`) to skip OAuth during development.

### Commands reference

| Command            | Purpose                          |
| ------------------ | -------------------------------- |
| `pnpm dev`         | Vite dev server (web only)       |
| `pnpm tauri dev`   | Full desktop app (requires Rust) |
| `pnpm build:web`   | Production web build             |
| `pnpm tauri build` | Production desktop build         |
| `pnpm test`        | Vitest watch mode                |
| `pnpm test:run`    | Vitest single run                |
| `pnpm check`       | Lint + format-check + type-check |
| `pnpm fmt`         | Auto-format with oxfmt           |

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
