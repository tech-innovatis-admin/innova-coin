# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## ⚠️ This is not the Next.js you know

This project runs **Next.js 16.2.1**, which is newer than most training data and has real breaking changes vs. older Next.js. Before writing or editing any routing/data-fetching/config code, check the relevant guide under `node_modules/next/dist/docs/` (an actual copy of the version-matched docs ships in this repo). Two things that already bit prior sessions:

- **Middleware is now called Proxy.** There is no `middleware.ts`. The file is `src/proxy.ts`, it exports a `proxy(request)` function (not `middleware`), and `export const config = { matcher: [...] }` still works the same way. See `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`.
- Route `params` in dynamic segments are async (`params: Promise<{ headId: string }>`, then `await params`) — see `src/app/admin/heads/[headId]/page.tsx`.

Don't assume any other Next.js API/behavior from memory — verify against the shipped docs first.

## Commands

```bash
npm run dev      # next dev --hostname 0.0.0.0 (binds all interfaces, for LAN/device testing)
npm run build    # next build
npm run start    # next start (serve production build)
npm run lint     # eslint
```

There is no test runner configured in this repo (no test script, no test files).

## Architecture

This is a single Next.js App Router app ("app-heads") implementing an internal bônus/withdrawal platform ("InnovaCoin") with two user-facing roles: **admin** (finance team) and **head/colaborador** (end users tracking their bônus balance). There is no separate backend — Postgres is accessed directly from route handlers/server actions/server components via `pg`.

### Auth & session model

- Credentials (`identifier` = email or username + `password`, bcrypt-hashed) are checked in `src/lib/auth.ts` against `public.users`.
- Sessions are signed JWTs (`jose`, HS256) via `src/lib/sessionToken.ts`, stored in an httpOnly cookie (`innova_session`, name in `SESSION_COOKIE_NAME`) with a 7-day expiry. The JWT embeds `{ id, platforms, innovacoinRoles, mustChangePassword }`.
- `src/proxy.ts` runs on every non-API request: it decodes the session cookie, computes a redirect via `getRedirectTargetForPathname` (in `src/lib/platformAccess.ts`), and — if the token predates the `mustChangePassword` claim — re-signs and re-attaches a refreshed cookie ("legacy session" upgrade, see `AGENTS.md`/recent commits).
- Server components/actions call `requireAuthenticatedUser()`, `requireAdminUser()`, or `requireHeadUser()` (`src/lib/auth.ts`) to enforce access and redirect; these duplicate (deliberately) the optimistic proxy-level checks per Next.js's proxy guidance ("not a full session/authorization solution").
- `src/lib/platformAccess.ts` is the single source of truth for path constants (`LOGIN_PATH`, `FIRST_ACCESS_PATH`, `ADMIN_HOME_PATH`, `HEAD_DASHBOARD_PATH`) and role/platform predicates (`innovacoin` platform; `admin` / `head` / `colaborador` roles stored as string arrays on the user row). Any new protected route or role check should go through this module, not ad-hoc string comparisons.
- Also supports Bearer-token auth (`Authorization: Bearer <jwt>`) as an alternative to the cookie, used by `/api/auth/*` JSON clients — see `getSessionUser()` in `src/lib/auth.ts`.

### Data layer

- `src/lib/db.ts` lazily creates a single global `pg.Pool` (`global.__appHeadsPgPool`), reading `DATABASE_URL`/`POSTGRES_*` env vars first, then falling back to discrete `DB_HOST`/`DB_PORT`/`DB_NAME`/`DB_USER`/`DB_PASSWORD`. TLS is on by default (`rejectUnauthorized: false`) unless `DB_SSL=false`.
- Core tables: `public.users` (roles/platforms as text arrays, `must_change_password` flag, bcrypt `hash`) and `public.parcelas_bonus` (per-user bônus installments: `valor_depositado` = accrues to the 5-year-locked balance, `valor_caju` = released immediately to the Caju benefits card).
- `src/lib/heads.ts` aggregates per-user summaries (balances, last installment, "pig" fill progress, availability/countdown) — used by both the admin list and the user dashboard. `src/lib/installments.ts` handles CRUD-ish reads on `parcelas_bonus` (create/update/delete are intentionally disabled in `src/app/admin/actions.ts` — bônus values are loaded from a spreadsheet import process, not entered manually in the UI).
- Ad-hoc schema/data migrations live as dated, hand-run SQL files in `src/sql/` (e.g. `2026-03-30_add_caju_bonus_support.sql`) — there is no migration framework; new schema changes should follow this same dated-file convention.
- Withdrawal availability differs by role: heads unlock 5 years after their first deposit; colaboradores unlock on a fixed date (`COLLABORATOR_WITHDRAW_DATE`, currently 2026-12-31) — see `deriveAvailability` in `src/lib/heads.ts`.

### Routes

- `src/app/api/auth/{login,logout,me}/route.ts` — JSON API, all responses go through `jsonNoStore()` (`src/app/api/auth/_lib/http.ts`) to force `Cache-Control: no-store`. Login accepts JSON, `multipart/form-data`, or `x-www-form-urlencoded` bodies (`_lib/loginRequest.ts`).
- `src/app/api/account/password/route.ts` — authenticated password change, re-issues the session cookie on success.
- `src/app/admin/**` — admin-only pages/actions (list of heads, per-head detail at `admin/heads/[headId]`, server actions in `admin/actions.ts`).
- `src/app/dashboard`, `src/app/primeiro-acesso`, `src/app/login` — end-user dashboard, forced first-access password change, and login page.
- Server actions (`"use server"` files like `admin/actions.ts`) call `revalidatePath()` on `/admin`, `/dashboard`, `/`, and the specific head page after mutations.

### Components

Barrel-exported by feature folder from `src/components/{admin,auth,dashboard,shared}/index.ts`, re-exported via `src/components/index.ts` — import everything as `import { X } from "@/components"` rather than deep-importing component files. `@/*` resolves to `src/*` (see `tsconfig.json`).

### Deployment

`next.config.ts` sets `output: "standalone"` and configurable `allowedDevOrigins` (env `ALLOWED_DEV_ORIGINS`, comma-separated). `Dockerfile` is a standard multi-stage build copying the standalone output; runs as a non-root `nextjs` user on port 3000.

### Language

All user-facing copy, form validation messages, and DB comments are in Brazilian Portuguese — keep new UI/copy consistent with this.
