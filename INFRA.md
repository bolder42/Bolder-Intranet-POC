# Bolder Intranet — Base Infrastructure

This document is the onboarding guide for the **base infrastructure** of the Bolder
Intranet POC. It captures the stack, the folder layout, and the patterns every
module owner MUST follow to keep the codebase compatible across parallel work.

The locked architectural decisions (single DB by `project_id`, three UI shells,
admin override, module boundaries at the data layer) live in `AGENTS.md` §5 and
the module list in `MODULES.md` — this file only covers **how the infrastructure
implements those decisions** so the team can build on top without compatibility
drift.

---

## 1. Stack

| Layer | Choice | Pinned version |
|---|---|---|
| Package manager | pnpm workspaces | 12.6.x |
| Orchestration | Turborepo | 2.11.x |
| Runtime | Node.js | ≥ 22.12 (env has 26.7) |
| Frontend | Next.js App Router | 15.5.x |
| UI library | React | 19.x |
| Language | TypeScript | 5.6.x (strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) |
| Backend framework | Hono | 4.13.x on Node |
| DB driver | better-sqlite3 (native) | 13.x — must run install/build script |
| ORM | Drizzle | 0.45.x (kit 0.31.x) |
| Validation | Zod | 4.6.x — single copy via catalog |
| Auth (frontend) | Auth.js v5 beta | 5.0.0-beta.32 (Credentials, JWT) |
| API client | Hono RPC (`hc<AppType>`) | end-to-end typed |
| Tests | Vitest | 5.0.x with `projects` |
| Lint | ESLint flat config | 9.x |
| Format | Prettier | 3.x |

All shared versions live in the `catalog:` block at the top of
`pnpm-workspace.yaml`. New packages MUST reference them as `"name": "catalog:"`
rather than pinning versions locally — this is what guarantees a single copy of
Zod / Hono / etc. across the workspace.

---

## 2. Folder layout

```
/
├── package.json                 # root scripts (delegate to `turbo run …`)
├── pnpm-workspace.yaml          # packages + catalog + allowBuilds
├── turbo.json                   # build/dev/test/lint/typecheck pipelines
├── tsconfig.base.json           # strict base config (shared by all packages)
├── vitest.config.ts             # root projects=[packages/*, apps/*]
├── eslint.config.mjs            # delegates to @repo/eslint-config
├── prettier.config.mjs          # delegates to @repo/prettier-config
├── .npmrc                       # strict-peer-dependencies, auto-install-peers
├── .env.example                 # DATABASE_URL, AUTH_SECRET, API_URL, …
│
├── tooling/                     # shared dev-tool configs
│   ├── eslint-config/           # flat config with module-boundary rules
│   ├── prettier-config/
│   ├── typescript-config/       # base.json / next.json / node.json
│   └── vitest-config/           # shared vitest setup
│
├── packages/                    # source-only (noEmit, exported via ./src/*)
│   ├── db/                      # Drizzle schema + scopedByProject + migrate
│   ├── shared/                  # Zod schemas + Role enum + error types
│   ├── auth/                    # role guards + session types
│   └── ui/                      # React primitives (Button/Input/Card)
│
└── apps/
    ├── api/                     # Hono backend (apps/api/src/...)
    │   ├── src/
    │   │   ├── index.ts         # server entry + graceful shutdown
    │   │   ├── app.ts           # CHAINED Hono app — AppType lives here
    │   │   ├── env.ts           # Zod-validated env
    │   │   ├── middleware/      # auth, error, projectScope
    │   │   ├── modules/
    │   │   │   ├── auth/        # routes + service + repo + test
    │   │   │   ├── projects/
    │   │   │   ├── home/        # READ-ONLY projection
    │   │   │   ├── tasks/       # STUB — module owner implements
    │   │   │   ├── wiki/        # STUB
    │   │   │   └── schedule/    # STUB
    │   │   └── db/              # thin re-exports of @bolder/db
    │   ├── drizzle.config.ts
    │   ├── data/                # gitignored SQLite file lives here
    │   └── scripts/seed.ts      # idempotent demo data
    │
    └── web/                     # Next.js 15 frontend
        └── src/
            ├── auth.config.ts   # edge-safe Auth.js config
            ├── auth.ts          # Node Auth.js config + Credentials
            ├── middleware.ts    # route protection
            ├── lib/api.ts       # Hono RPC client (typed end-to-end)
            ├── components/      # shell + ui + providers
            └── app/
                ├── layout.tsx                # ROOT (html/body, providers)
                ├── page.tsx                  # redirect → /app
                ├── auth/                      # AUTH shell (centered card)
                │   ├── layout.tsx
                │   ├── login/page.tsx
                │   └── register/page.tsx
                ├── app/                      # APP shell (sidebar+header)
                │   ├── layout.tsx
                │   ├── page.tsx              # HOME — Anytype-style dashboard (READ-ONLY projection)
                │   └── projects/
                │       ├── page.tsx          # projects list
                │       └── [projectId]/      # PROJECT shell
                │           ├── layout.tsx
                │           ├── page.tsx
                │           ├── tasks/page.tsx     # TODO
                │           ├── wiki/page.tsx      # TODO
                │           └── schedule/page.tsx  # TODO
```

---

## 3. Three UI shells (locked by AGENTS.md §5)

Composed via Next.js `layout.tsx`, **never per-page**:

| Shell | Path prefix | Layout file | Gating |
|---|---|---|---|
| Auth | `/auth/*` | `src/app/auth/layout.tsx` | none (public) |
| App | `/app/*` | `src/app/app/layout.tsx` | middleware + `auth()` check in layout |
| Project | `/app/projects/[projectId]/*` | `src/app/app/projects/[projectId]/layout.tsx` | requires App auth + project membership |

**Rules for module owners:**

- Adding a new module? Place its routes inside the correct shell. **Do not** create a fourth shell.
- The Auth shell may never render authenticated content; the App and Project shells may never render unauthenticated content.

---

## 4. Theme system

The web app ships a dual light/dark theme, driven entirely from CSS tokens. No
Tailwind, no UI kit. Module owners writing pages or components MUST follow
this contract; raw hex values are not allowed in component styles.

**Tokens.** All color, radius, shadow, and shell-dimension values live in
`apps/web/src/app/globals.css`:

- `:root` defines the light tokens (`--color-canvas`, `--color-rail`,
  `--color-surface`, `--color-surface-tint`, `--color-surface-elevated`,
  `--color-border`, `--color-border-strong`, `--color-text-primary`,
  `--color-text-muted`, `--color-text-subtle`, `--color-hover`, `--color-accent`,
  `--color-accent-hover`, status colors `--color-danger`, `--color-amber`,
  `--color-blue`, `--color-green`, plus `--sidebar-width`, `--header-height`,
  `--toolbar-pill-height`).
- `html[data-theme='dark']` overrides the same names for dark. Dark neutrals
  lean purple (~275°), muted text sits at ~10% saturation.

Use the tokens, not hex: `color: var(--color-text-primary);` — never
`color: #1f1f1f;` in a component.

**Switching themes.** `apps/web/src/app/layout.tsx` injects a small blocking
inline `<script>` that runs **before first paint** and sets
`document.documentElement.dataset.theme` based on `localStorage.theme` (one of
`'light' | 'dark' | 'system'`, falling back to `'system'` which resolves
against `prefers-color-scheme`). The script must stay synchronous and inline;
a deferred script will flash the wrong palette on first paint.

**Runtime toggling.** `apps/web/src/components/theme-provider.tsx` owns the
`data-theme` attribute after hydration and exposes `useTheme()`. The
`<ThemeToggle>` primitive (`apps/web/src/components/shell/theme-toggle.tsx`,
mounted in the app header) is a 2-state cycle between light and dark.

**Adding a token.** Add it to **both** `:root` and `html[data-theme='dark']`
in `globals.css`. New tokens must follow the existing naming (`--color-*` for
color, `--*-width`/`--*-height` for dimensions, `--font-*` for typography).
Components outside `packages/ui/` import the stylesheet once at the App shell
layout; do not re-import per-component.

**Inter / typography.** `next/font/google` loads Inter in `app/layout.tsx`
and exposes it as `--font-inter`, aliased to `--font-sans` in `globals.css`.
Don't import Inter directly from a component.

---

## 5. Module boundaries at the data layer (locked by AGENTS.md §5 + §6)

Every backend module is split into **routes → service → repo**:

```
modules/<name>/
├── <name>.routes.ts    # Hono sub-app + zValidator + calls into service
├── <name>.service.ts   # business logic, role checks via @bolder/auth guards
├── <name>.repo.ts      # ONLY place that imports @bolder/db
└── <name>.test.ts      # integration test
```

**Enforced by ESLint** (see `tooling/eslint-config/index.mjs`):

- `apps/api/src/modules/**/*.ts` MAY NOT import `**/db/client` or `@bolder/db/client`. The only files that can touch the DB client are `*.repo.ts` files and `**/db/**`.

This is the architectural invariant that keeps module owners from colliding. The Home module reads from Projects / Tasks / Wiki / Schedule via their **service-layer public APIs**, never via the tables directly.

---

## 6. `project_id` partitioning

Every table except `users`, `sessions`, and `project_members` (which has its own
FK) carries `projectId integer notNull references projects.id onDelete cascade`
plus an index. Queries for those tables MUST go through the helper:

```ts
// packages/db/src/scope.ts
import { and, eq, type SQL } from "drizzle-orm";
import { scopedByProject } from "@bolder/db/scope";

db.select().from(tasks)
  .where(scopedByProject(tasks, projectId, eq(tasks.status, "todo")))
```

There is no Postgres-style RLS here — the partitioning is a **data-layer
convention** plus the index. CI does not enforce it automatically, but a query
that forgets `scopedByProject` will leak data across projects.

If you add a new project-scoped table:

1. Add the schema to `packages/db/src/schema/<table>.ts`. Always include
   `projectId` FK to `projects.id` with `onDelete: "cascade"` and an index on it.
2. Re-export it from `packages/db/src/schema/index.ts`.
3. Run `pnpm --filter @bolder/db db:generate` to create a new migration.
4. Use `scopedByProject(yourTable, projectId, …)` in every query.

---

## 7. Roles & permissions (locked by MODULES.md + AGENTS.md §5.5)

Roles are global: `dev`, `tech_lead`, `admin`. **Tech Lead is a single global
position, not a per-project role** — there is no `lead`/`member` distinction
on `project_members`, and no per-project "project lead" concept. Project
membership is binary: a user is either a member or not. Authorization for
project mutations depends only on the actor's global role. **Admin always
passes** every check.

Guards (in `@bolder/auth`):

| Guard | What it enforces |
|---|---|
| `requireGlobalRole(ctx, roles)` | global role; admin auto-pass |
| `requireProjectMember(projectId, ctx)` | user is `admin` OR is a member of that project |
| `canWriteProject(user)` | boolean — true when the user's global role can write to projects (`tech_lead` or `admin`) |

Pattern in a route handler:

```ts
.post("/", zValidator("json", CreateTaskSchema), async (c) => {
  const user = c.get("user");                         // set by authMiddleware
  const projectId = c.get("projectId");               // set by projectScope middleware
  await requireProjectMember(projectId, { user });    // throws 403 if denied
  return c.json(await tasksService.create(projectId, c.req.valid("json")), 201);
})
```

For project mutations (create / update / add or remove a member), use
`requireGlobalRole(ctx, ['admin', 'tech_lead'])` — there is no per-project
"lead" check anymore.

---

## 8. Auth flow

Two files, two runtimes — required because Next.js middleware runs on the Edge
runtime and cannot import Node-only modules (Credentials provider, `@bolder/db`,
hashing libs).

| File | Runtime | Responsibility |
|---|---|---|
| `apps/web/src/auth.config.ts` | Edge | Empty `providers`, `session.strategy: "jwt"`, `authorized` callback for route gating. **NO Credentials, NO @bolder/db imports.** |
| `apps/web/src/auth.ts` | Node | Adds Credentials provider, calls backend `POST /api/auth/verify`, stores backend JWT + role in the session. |
| `apps/web/src/middleware.ts` | Edge | `NextAuth(authConfig)` only — imports `auth.config.ts`, not `auth.ts`. |

ESLint enforces this boundary — `auth.config.ts` is forbidden from importing
`next-auth/providers/credentials`, `@bolder/db`, hashing libs, etc.

---

## 9. Hono RPC end-to-end types

The frontend gets full type safety from `apps/api/src/app.ts` to the page
component. The pattern is:

```ts
// apps/web/src/lib/api.ts
import { hc } from "hono/client";
import type { AppType } from "../../../api/src/app";   // TYPE-ONLY, erased at build

export const api = hc<AppType>(`${process.env.NEXT_PUBLIC_API_URL}/api`);
```

**Gotchas** (all observed during base infra setup):

1. **`app.ts` MUST be chained**. `const app = new Hono().route(...)` makes `typeof app` lose its route types. Use `new Hono().method().method().route(...)` all the way through.
2. **Hono's RPC client does NOT apply the server `basePath` to URLs**. The server's `.basePath('/api')` means the client base URL is `${NEXT_PUBLIC_API_URL}/api` (note the `/api` at the end).
3. **`basePath('/api')` shows up as a top-level property on the client**. So routes look like `api.api.projects.$get()`, `api.api.home.summary.$get()`, `api.api.projects[':projectId'].$get({ param: { projectId } })`. The outer `api` is the client property name; the inner `api` is the path segment.
4. **Path params use `[':paramName']` bracket access**, not `.paramName`.
5. **Sub-app route types propagate through chained `.route()`** — but only when sub-apps are constructed with `Hono<AppEnv>()` (not bare `new Hono()`). Every existing sub-app uses `new Hono<AppEnv>()`.

---

## 10. How to add a new module

Wiki / Schedule / Tasks owners follow the same recipe:

### Backend (`apps/api/src/modules/<name>/`)

1. Replace `<name>.stub.ts` with real files:
   - `<name>.routes.ts` — `new Hono<AppEnv>()`, mount via `.route('/<name>', <name>Routes)` in `app.ts`.
   - `<name>.service.ts` — business logic + role guards from `@bolder/auth`.
   - `<name>.repo.ts` — Drizzle queries via `scopedByProject`.
2. If you need new tables: add them to `packages/db/src/schema/<table>.ts` (always with `projectId` FK + index). Run `pnpm --filter @bolder/db db:generate` to create a migration.
3. If you need new request/response shapes: add Zod schemas to `packages/shared/src/<name>.ts` and re-export from the barrel.
4. Add `<name>.test.ts`. The auth + projects test files in `apps/api/src/modules/{auth,projects}/` are templates — they boot a fresh SQLite via `apps/api/test/helpers.ts` per test.

### Frontend (`apps/web/src/app/app/projects/[projectId]/<name>/`)

1. Replace the placeholder `page.tsx` (the one that says "TODO").
2. Call the backend via `api.api.<name>.<endpoint>.$get(...)` (typed).
3. Add a Zod-derived UI form component using `@bolder/ui` primitives.

### Tests

Per AGENTS.md §2: new modules MUST have at least one test per route handler, and the full monorepo test suite MUST pass before merging.

---

## 11. Running things

From repo root:

```bash
pnpm install                              # install (allowBuilds runs better-sqlite3 native build)
pnpm turbo run dev                        # starts both api (3001) and web (3000) in parallel
pnpm turbo run typecheck                  # strict TS check across all packages
pnpm turbo run test                       # Vitest across all packages (root config aggregates coverage)
pnpm turbo run lint                       # ESLint flat config across all packages
pnpm turbo run build                      # production build (Next.js + tsc --noEmit for backend)

# Backend-specific
pnpm --filter @bolder/api db:migrate      # apply migrations to data/app.db
pnpm --filter @bolder/api seed            # idempotent demo data (1 admin, 1 tech_lead, 2 devs, 2 projects)
pnpm --filter @bolder/db db:generate      # regenerate migration after schema changes
```

Demo login (after seeding): `admin@bolder.local` / `admin123`.

---

## 12. Gotchas cheatsheet

- `pnpm install` requires `allowBuilds:` in `pnpm-workspace.yaml` so better-sqlite3, esbuild, and @swc/core can run their install scripts. This is set up.
- **`basePath('/api')` doubles as a client path segment**: routes look like `api.api.X.Y` on the frontend.
- **Next.js `params` is async in 15**: `const { projectId } = await params`. Type as `Promise<{ projectId: string }>`.
- **ESLint flat config comments must not contain `*/`** — it closes the comment early. Always write paths in code comments as prose ("the data layer") not as glob patterns.
- **Single Zod copy** via catalog. Never pin `zod` directly in a `package.json` — use `"zod": "catalog:"` (or `peerDependency` for shared types).
- **No DB client imports outside `*.repo.ts` and `**/db/**`**. Enforced by lint.
- **No Node-only imports in `auth.config.ts` or `middleware.ts`**. Enforced by lint.
- **`verbatimModuleSyntax` is on** — `import type { … }` for types, `import { … }` for runtime values. Mixing them fails the typecheck.
- **`AUTH_SECRET` is mandatory and must be persistent.** Copy `.env.local.example` to `apps/web/.env.local` and put a real `openssl rand -base64 32` value in `AUTH_SECRET`. Without it, Auth.js v5 auto-generates one on each dev-server start, the next request 500s on `/api/auth/session`, and the client throws `ClientFetchError`. **Never commit `.env.local`.**
- **Theme tokens only — no hardcoded colors.** Every color in component CSS must be a `var(--color-*)` from `globals.css`. Hardcoded hex values break the dark theme silently and will be caught by review. If a needed token doesn't exist, add it to **both** `:root` and `html[data-theme='dark']` rather than inlining a hex.
- **Hydrating from `localStorage` requires a `mounted` gate (or post-mount sync).** Reading storage in a `useState` initializer causes a hydration mismatch (server renders the fallback, the first client render reads storage and renders something else). `useLocalStorage` in `apps/web/src/hooks/use-local-storage.ts` initializes with the fallback and syncs in `useEffect` — use it for any persisted UI state (sidebar collapsed, theme, etc.).