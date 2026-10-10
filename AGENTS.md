# AGENTS.md

Rules and context for AI agents working on the Bolder Intranet project.

---

## 1. MODULES.md language policy

`MODULES.md` is the source of truth for the project's module organization and must be kept in **English** for ease of use by AI agents.

When an agent receives an update to the modules through any of the following inputs:
- a board image,
- a written description,
- a conversation,
- or any other artifact whose content is in Portuguese,

the agent **is allowed and expected to translate** the content into English in order to write it into `MODULES.md`.

### Translation guidelines

Translation must be done carefully and must **not deviate from the original specifications**. Concretely:

1. **Preserve meaning exactly.** Do not reword, simplify, expand, or reinterpret requirements. If a sentence says "X MUST happen", the translation must say "X MUST happen" — not "X should happen" or "X is expected to happen".
2. **Preserve emphasis.** Text written in ALL CAPS, bold, or with explicit urgency markers in the original must keep that emphasis in the translation.
3. **Preserve technical terms as-is.** Keep code identifiers (`project_id`), product names (Notion, GitHub), and well-known technical vocabulary (kanban, milestone, deadline, database, READ, WRITE) in English even if they appear in the source text.
4. **Preserve access-control semantics.** Statements about database access (READ, WRITE, READ-ONLY) are load-bearing; do not paraphrase them.
5. **Fix obvious typos only when they cannot plausibly be intentional.** For example, "notoin" → "Notion" is an obvious typo to correct. Do not "fix" things that might be deliberate wording.
6. **Preserve structure.** If the source lists sub-bullets, annotations, or "always belongs to a project" notes, keep them in the translation with the same hierarchy.
7. **Preserve scope rules.** Statements like "is not standalone" or "belongs to a project" describe architectural invariants — they must appear in the translation exactly as they constrain the module.

When in doubt about whether a translation preserves the spec faithfully, prefer a more literal translation over a more idiomatic one.

---

## 2. Testing

**Tests are required for new features and refactors.**

- For any new feature or refactor, the agent MUST (1) add tests covering the new or changed behavior, and (2) run the **full monorepo test suite** to confirm all tests pass.
- Pure documentation or config-only changes (e.g., updating `.md`, dependency version bumps, `tsconfig` tweaks) are exempt from the test requirement.
- Every workspace package (`apps/*`, `packages/*`, `tooling/*`) MUST declare `test`, `lint`, `typecheck`, and `build` scripts in its `package.json`. Turborepo silently skips packages that are missing a given task, so a new package without a `test` script would let untested code into the codebase unnoticed. When adding a new package, verify it shows up in `turbo run test` output from the repo root.
- **Auth.js test setup.** `apps/web/src/auth.config.ts` reads `process.env.AUTH_SECRET` at module load and throws if it is undefined. Any test that transitively imports `auth.config.ts` or `auth.ts` (directly or via a component) MUST set `process.env.AUTH_SECRET` before that import runs — either in a vitest `setupFiles` entry that executes before test-file evaluation, or in a `beforeAll` placed before the import in the test body. The current full suite passes only because no test currently imports the auth modules; the moment one does, this guard fires at collection time.

**Failure policy: branch vs. merge.**

- On a feature/working branch: failing tests are tolerated IF clearly marked (e.g., `it.todo()`, `it.skip`, or a comment explaining the gap). This lets the agent iterate without being blocked.
- Before a PR is opened against `main` (or the change is otherwise considered final): ALL tests MUST pass. Failing tests at this stage MUST be fixed or the change must be reverted. A PR with red tests is not acceptable.

**Definition of "done" for any code change:**

1. Feature/refactor has tests covering it (when applicable).
2. Full monorepo test suite has been run.
3. All tests pass on the final state.
4. Any new `.md` files or updates to existing ones (this file, `MODULES.md`) are committed in the same change.

---

## 3. Documentation sync

**Documentation is part of "done."**

The `.md` files in this repository are load-bearing for both humans onboarding and AI agents receiving context on each run. Stale documentation is a bug. When a change affects structure, scope, or onboarding, the relevant `.md` files MUST be updated in the same commit.

**Which file to update:**

- **`AGENTS.md`** — when the change affects how AI agents must behave: new agent rules, new locked architectural decisions, new POC exclusions, or any update to the translation policy or testing rules in this file.
- **`MODULES.md`** — when the change adds, renames, removes, or alters the scope of a module; when access rules (READ / WRITE / READ-ONLY) change; or when a module's relationship to `Projects` (its parent) changes. Follow the language policy in section 1 of this file.
- **New `.md` file** — when the change introduces a concept the team needs to know (a new architectural pattern, a new workflow, a new constraint) and no existing file covers it. Create a new file rather than overloading an unrelated one.

**`README.md` — narrow exception.** This file is human-authored. AI agents MAY modify it ONLY to add or update a "How to run the project" section: install command, dev/build/test commands, ports, environment variables, demo credentials. Every other part of `README.md` (project description, team notes, anything else) is human-owned and agents MUST NOT edit it.

**Do NOT read or consult `CONTRIBUTING.md`.** This file is for human developers only and describes human workflow (PR checklists, branch naming, code review expectations). AI agents must not act on its contents; doing so risks the agent applying human-process rules to its own work.

**What "stale" looks like:**

A `.md` file is considered stale when a reader following it would make a wrong decision — e.g., building a feature that has been excluded from POC scope, using a test pattern that has been superseded, or assuming a module boundary that no longer holds. If the rule would mislead, update the rule.

**Translation reminder (cross-refers to section 1):**

Source inputs to `MODULES.md` may be in Portuguese (board images, written descriptions, conversations). The agent MUST translate them to English per section 1 before writing into `MODULES.md`. Translations must preserve meaning exactly.

---

## 4. Project context

Prototype POC of a corporate intranet for small/medium companies. Combines knowledge organization (Notion-like) with project tracking (kanban + calendar). The goal is a demonstrable prototype, not a production-grade system.

**Stack:** fully JavaScript-based, with React on the frontend and Node, Bun, or Deno on the backend.

**Deadlines:**
- Progress preview: **October 9, 2026**
- Final presentation: **October 30 – November 6, 2026** (date to be confirmed)

---

## 5. Locked architectural decisions

Do not re-litigate these without explicit team approval:

1. **Single database**, partitioned by `project_id`. No multi-DB or per-tenant database.
2. **`Projects` is the parent / aggregate root.** Wiki, Schedule, and Tasks each carry a `project_id` FK referencing `projects.id`. They are not standalone and cannot exist without a parent project.
3. **`Home page` is a read-only projection** that composes data from Projects, Tasks, Schedule, and Wiki. It must never write to the database.
4. **Three UI shells**, not per-page: Auth shell, App shell, Project shell. Composed via Next.js `layout.tsx`.
5. **Admin role overrides all module-level write rules.** Per MODULES.md, Admins have access to all operations even when not explicitly stated in the module.
6. **Module boundaries are enforced at the data layer.** Each upstream module exposes a small public interface; other modules (especially Home) read through those interfaces, never directly into the tables.

---

## 6. POC scope boundaries — do NOT build

Explicitly out of scope for the POC to prevent drift:

- Chat or messaging (Slack is inspiration, not a requirement)
- Notifications module (deferred by decision; revisit post-POC)
- Real-time collaboration (websockets, live cursors, presence)
- Email digests, push notifications, external webhooks
- Full GitHub Projects parity — kanban stays minimal: To Do / Doing / Done
- Per-project customization (theming, custom workflows, custom fields)
- Native mobile app — responsive web only
- SSO / SAML / OAuth providers — Auth.js with email/password is enough for POC
- Multi-tenant isolation — single-tenant POC, revisit later

When in doubt about whether something belongs in the POC, ask the team before building it.

---

## 7. Base infrastructure

The stack, folder layout, three UI shells, module boundaries, role guards, and Hono RPC patterns are documented in `INFRA.md`. Module owners MUST read it before adding a backend module or a new page.

Key invariants the infrastructure enforces (see `INFRA.md` for full detail):

- The backend DB client is imported only by `*.repo.ts` files and `**/db/**` (ESLint-enforced).
- `auth.config.ts` and `middleware.ts` run on the Edge runtime — Node-only imports are ESLint-forbidden.
- Frontend call sites use `api.api.<path>` because the server's `basePath('/api')` becomes a top-level client property.
- Every workspace package MUST declare `test`, `lint`, `typecheck`, and `build` scripts (see §2 above).

---

## 8. Pull request workflow

This repository uses a GitFlow-style layout: `develop` is the integration branch and `main` is the release branch. The rules below are the direct consequence of that, and they exist because accidental merges to `main` have already happened in this repo.

- **Default PR target is `develop`, never `main`.** All PRs opened by an agent — features, fixes, refactors, chore PRs — MUST target `develop` by default.
- **A PR to `main` requires an explicit, unambiguous request AND a confirmation step before the agent opens it.** "Merge it", "open the PR", or any other phrasing that could be read as targeting `main` (especially when the agent is currently on `main` or the only plausible base appears to be `main`) is NOT sufficient. The agent MUST pause and ask the user to explicitly confirm the target branch and that `main` is the intended destination, citing this rule, before opening the PR. No inference, no best-guess.
- **`main` is updated only via a release PR from `develop`.** Do not merge a feature branch, a `fix/*` branch, or any other branch into `main` directly, even if the user is already on `main` and says "merge it" — confirm first.