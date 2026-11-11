# Implementation Log — Tasks Module (Kanban per project)

Running log of the assisted implementation of the Tasks module.
Goal: kanban board at `/app/projects/<id>/tasks` (GitHub-like), tasks always
belong to a project, all participants can modify, status-change timestamps for
later cycle-time analysis.

---

## Decisions (confirmed with the product owner, 2026-10-10)

| Topic | Decision |
|---|---|
| Status history | **Event table** `task_status_events` — every transition records from→to, timestamp, and who moved it. Enables cycle time / lead time analysis and handles reopen (done→doing). |
| Interaction | **Drag-and-drop** between columns (native HTML5, no new deps) + accessible per-card status select as fallback. |
| Task fields | Keep the existing schema: title, description, status (todo/doing/done), assignee, due date. No labels/priority (POC scope limit, AGENTS.md §6). |
| Assignees | **Single** assignee per task (existing `assignee_id`). |

## Scope

- Backend: new table + migration, shared Zod schemas, full API module
  (list / create / update / move / delete / events), integration tests, seed
  demo data with realistic status timelines.
- Frontend: kanban board (3 columns, progress bar, cards with assignee + due
  date, create/edit/delete), component tests.
- Docs: MODULES.md line about the status history; this log.

## Work graph

| # | Lane | Agent | Scope (write ownership) | Status |
|---|---|---|---|---|
| 1 | Backend | @fixer (ses_ed825b634ffewh4v0oEbuInY46) | `packages/db`, `packages/shared`, `apps/api`, `MODULES.md` | ✅ done |
| 2 | Frontend | @designer (ses_ed825b631ffex45GYiFtpvoqf9) | `apps/web` (components/tasks + tasks page) | ✅ done |
| 3 | Reconcile + verify | orchestrator | integration fixes, full suite, browser check | ✅ done |

## API contract (frozen before lanes started)

Mounted at `/api/tasks` (Hono RPC, end-to-end typed):

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/tasks/:projectId` | — | `{ tasks: TaskListItem[] }` |
| POST | `/tasks/:projectId` | CreateTaskSchema | `201 { task }` |
| PATCH | `/tasks/:projectId/:taskId` | UpdateTaskSchema (no status) | `{ task }` |
| PATCH | `/tasks/:projectId/:taskId/status` | `{ status }` | `{ task }` (writes event) |
| DELETE | `/tasks/:projectId/:taskId` | — | `{ ok: true }` |
| GET | `/tasks/:projectId/:taskId/events` | — | `{ events: TaskEvent[] }` |

`TaskListItem = Task & { assignee: {id,name,email,role} | null }`.
Guards: `requireProjectMember` on every route (any participant may read AND
write; Admin auto-passes). Assignee must be a project member.

## Timeline

- 2026-10-10 — Recon complete: existing `tasks` table + shared schemas + 501
  stub + TODO page mapped; projects module chosen as pattern template.
- 2026-10-10 — Scope questions answered (see Decisions).
- 2026-10-10 — Lanes 1 (backend) and 2 (frontend) dispatched in parallel,
  disjoint write scopes, contract frozen.
- 2026-10-10 — **Lane 2 (frontend) COMPLETE.** Board + card + form + DnD
  (native HTML5, zero new deps) + accessible per-card status select + progress
  bar + pt-BR due dates with overdue/due-soon tones + optimistic moves with
  rollback. Files: `apps/web/src/components/tasks/{task-types,task-utils,tasks-api,kanban-board,task-card,task-form}.ts(x)`
  + `kanban.css` + `tasks/page.tsx`. Tests: 16 files / 60 tests pass (12 new).
  Lint clean. Typecheck: 6 TS7053 errors on `api.api.tasks[':projectId']` —
  expected while AppType still carries only the 501 stub; should clear when
  Lane 1 lands (call shapes already match the frozen contract, no frontend
  changes anticipated).
- 2026-10-10 — Lane 1 (backend) still in progress. Reconcile blocked on it.
- 2026-10-10 — **Lane 1 (backend) COMPLETE.** Table `task_status_events`
  (cascade from tasks/projects, `set null` from users, nullable fromStatus,
  indexes on taskId/projectId) + migration `0003_sweet_runaways.sql`. API =
  exactly the six contract paths; repo is the sole `@bolder/db` importer;
  create/move/update wrapped in transactions so the audit trail cannot drift
  from the board; assignee must be a project member (400 otherwise). Seed: 11
  demo tasks (6 Apollo / 5 Intranet) with full created→…→current trails,
  overdue + upcoming due dates — idempotent (11 tasks / 21 events on rerun).
  MODULES.md got the one-line status-history note. Lint/typecheck/test all
  green at lane end (api tasks.test.ts = 11 integration tests).
- 2026-10-10 — **Reconciliation:** zero integration fixes needed — frontend
  call shapes matched the contract verbatim; backend landed the types the
  frontend's 6 pending TS7053 errors were waiting on.
- 2026-10-10 — **Verification COMPLETE.** Full suite green (104 tests:
  api 32 incl. 11 tasks / web 60 / shared 12 / auth 8 / ui 7 / db 3);
  typecheck 10/10; lint 6/6. Migrations + seed applied. Dev restarted clean
  (orphan processes on 3000/3001 cleared). Live smoke test via API:
  login → list project tasks (Apollo: 6 tasks, 2/2/2 per column) →
  move `todo→doing` → status updated AND `task_status_events` recorded
  `(criacao)→todo` + `todo→doing` with actor + timestamp. Board page
  `/app/projects/13/tasks` serves HTTP 200, no compile errors.
  Note: seed re-runs bump project IDs (autoincrement) — Apollo may not be 1
  after a reseed; the app always links from the real id.
- 2026-10-10 — **STATUS: DONE.** Board live at
  http://localhost:3000/app/projects/<id>/tasks (login admin@bolder.local /
  admin123). PR not yet opened — pending team decision.
- 2026-10-10 — **Regression found in real browser (user report):** client
  crash "AUTH_SECRET is not set" on the tasks page. Root cause: the board
  ("use client") imported `tasks-api.ts` → `@/lib/api` → runtime
  `import { auth } from '@/auth'` → `auth.config.ts` module-load check
  throws in the browser (process.env.AUTH_SECRET never exists client-side).
  Earlier smoke test missed it (server HTML was 200; the crash is
  client-side at hydration). FIX: new `tasks-actions.ts` (server actions,
  same pattern as projects actions — the backend JWT only exists inside the
  encrypted Auth.js cookie, readable server-side only); `tasks-api.ts`
  rewritten as a thin client facade over the actions (signatures unchanged,
  board + 60 tests untouched). Verified: web tests 60/60, typecheck 0,
  lint 0, and NO compiled client chunk contains the auth module anymore.
  User subsequently exercised the board live (12 successful server-action
  POSTs in the dev log) — fix confirmed in real usage.
  Lesson logged: client-side JS execution (or client-bundle inspection)
  must be part of validation for UI changes, not just server HTML fetches.
- 2026-10-12 — **UPDATE REQUESTED:** add a 4th kanban column "Backlog"
  (leftmost) + per-task priority flag (low/medium/high, default medium,
  UI labels Low/Medium/High). Owner-approved scope change vs AGENTS.md §6
  ("kanban stays minimal: To Do / Doing / Done") — that bullet is being
  updated in the same change. Delta-contract frozen: TaskStatus += backlog;
  new TaskPrioritySchema; TaskListItem += priority; create/update payloads
  += priority?; no new endpoints.
- 2026-10-12 — Update lanes dispatched in parallel:
  - @fixer (ses_ecd5737efffe7GVxWm2qwcUDXS) — DB enum + priority column +
    migration 0004 + shared schemas + API round-trip + seed + tests +
    MODULES.md/AGENTS.md docs.
  - @designer (ses_ecd5737ecffe9O9jmmiVGYyjZd) — 4-column board + priority
    badge on cards + form select + CSS tones + component tests.
- 2026-10-12 — **Update Lane UI (designer) COMPLETE.** Backlog column
  leftmost (count pill, "+" preset, drag-drop + keyboard select all map
  STATUS_COLUMNS, so 4 options for free). Priority badge pinned above card
  title: High→danger, Medium→amber, Low→blue (token-only, color-mix tints,
  light/dark safe). Backlog cards get a muted dashed left edge vs solid for
  To Do. Form: Priority select after Due date, Medium default on create,
  edit prefills with `?? "medium"` fallback for pre-field rows. Tests: 65
  web tests pass (new: 4-column order, backlog render, 3 badge tones,
  create-with-priority, backlog "+" preset, move-to-backlog via select,
  default-Medium + edit prefill). Web typecheck clean; one pending api
  error (tasks.service.ts missing priority in create) correctly left to
  the backend lane. Lint clean.
- 2026-10-12 — **Owner tweak:** priority badge moved from above the title
  to BELOW it (card order: title → priority badge → description →
  assignee/due row → Move-to select). Same designer session resumed.
  No CSS changes needed (flex gap already correct); one new test locks the
  DOM order via compareDocumentPosition. Web tests 66/66, typecheck exit 0
  (apps/api typecheck also green by then — backend lane had landed the
  create-priority fix).
- 2026-10-12 — **Update Lane Backend (fixer) COMPLETE.** Enums backlog em
  tasks + taskStatusEvents; coluna priority notNull default 'medium';
  migração 0004_fuzzy_pixie.sql gerada pelo drizzle-kit (só o ALTER do
  priority — widening de enum em SQLite não gera SQL, esperado) e aplicada.
  Shared: TaskPrioritySchema/TaskPriority, priority em Task/Create
  (default medium)/Update (parcial); MoveTaskSchema aceita backlog.
  API: priority persistido no create/update e no select da list; nenhum
  endpoint novo. Seed: 11 tasks com prioridades variadas (6 medium /
  3 high / 2 low) + 3 novas backlog (1 Apollo / 2 Intranet) com trilhas
  created→backlog — idempotente (2 runs verificados). Docs: MODULES.md
  sentence das quatro fases + prioridade; AGENTS.md §6 bullet atualizado.
  Fora do plano mas necessário: scope.test.ts (DDL hand-rolled em @bolder/db)
  precisou da coluna priority. Validação completa: migrate ✅, seed ✅×2,
  test 10/10 packages (139 testes, api tasks=15), typecheck 10/10, lint 6/6.
  Zero desvios do delta-contract.
- 2026-10-12 — Owner tweak dispatched: board as 4 side-by-side columns
  (quadro view) — @designer same session, in progress. Reconciliation
  pending on that lane.
- 2026-10-12 — **Quadro layout COMPLETE (designer, CSS-only).** Desktop
  ≥1024px: `.kanban-columns` = grid repeat(4, minmax(0,1fr)) — four equal
  columns, never wrap; min-width:0 + overflow-wrap:break-word so long
  titles wrap instead of overflowing. <1024px: horizontally scrollable
  board strip with scroll-snap, columns clamp(240px,72vw,300px), scroll
  contained so the page never overflows sideways. Tokens-only, no DOM
  changes, no test changes needed. Web tests 66/66, typecheck exit 0.
- 2026-10-12 — **RECONCILIATION:** no integration conflicts — lanes touched
  disjoint files; final evidence: full monorepo suite green at backend
  lane end (139 tests, typecheck 10/10, lint 6/6) + web suite re-run
  green twice after the last two designer tweaks. Dev restart + live
  board validation next.
- 2026-10-12 — **LIVE VALIDATION COMPLETE (post-update).** Dev restarted
  clean; migration 0004 + seed already applied by backend lane. Simulated
  browser session against Apollo (id 19 after reseed): page HTTP 200;
  all four columns present (Backlog/To Do/Doing/Done); priority labels
  Low/Medium/High in HTML; 7 draggable cards; 14 priority badges rendered;
  progress 29% (2/7 done). Compiled CSS contains
  `.kanban-columns { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); }`
  — the quadro layout is live. Dev log clean (no errors/warnings beyond
  pre-existing lockfile note).
- 2026-10-12 — **STATUS: UPDATE DONE.** Backlog column + priority flag +
  badge below title + 4-column quadro layout all live at
  http://localhost:3000/app/projects/<id>/tasks. Code still uncommitted
  on `fix/dev-runner-windows`; PRs still pending owner decision.
- 2026-10-12 — **Owner ask: widen the board** (cards felt squeezed; no
  guideline blocks it — locked decisions cover shells/tokens/module
  boundaries, not content width). Designer, CSS-only, one scoped rule:
  `.project-shell:has(> .project-content > .kanban) { max-width: 1240px }`
  — widens ONLY shells rendering a kanban; Overview/Wiki/Schedule keep
  the 840px prose measure. Cards ~174px → ~274px usable (on 1440px
  laptops the sidebar caps it first at ~237px — still a clear gain, and
  max-width-only so it degrades gracefully). Rejected: global shell
  widening (side effects on prose pages) and negative-margin breakout
  (fragile). Web tests 66/66, typecheck exit 0. Verified compiled into
  the live dev CSS bundle.
