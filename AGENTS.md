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

## 2. Project context

Prototype POC of a corporate intranet for small/medium companies. Combines knowledge organization (Notion-like) with project tracking (kanban + calendar). The goal is a demonstrable prototype, not a production-grade system.

**Stack (locked):** JavaScript only. Next.js App Router (full-stack), shadcn/ui + Tailwind, Tiptap (wiki editor), dnd-kit (kanban drag/drop), Drizzle ORM, SQLite for POC (Postgres later), Auth.js. Backend runtime: Node, Bun, or Deno.

**Repo shape (locked):** pnpm workspaces + Turborepo monorepo.
- `apps/web/` — Next.js app
- `packages/db/` — Drizzle schema + repos
- `packages/auth/` — session, RBAC helpers
- `packages/ui/` — shared shadcn-based components
- `packages/contracts/` — zod schemas, shared types

**Deadlines:**
- Progress preview: **October 9, 2026**
- Final presentation: **October 30 – November 6, 2026** (date to be confirmed)

---

## 3. Locked architectural decisions

Do not re-litigate these without explicit team approval:

1. **Single database**, partitioned by `project_id`. No multi-DB or per-tenant database.
2. **`Projects` is the parent / aggregate root.** Wiki, Schedule, and Tasks each carry a `project_id` FK referencing `projects.id`. They are not standalone and cannot exist without a parent project.
3. **`Home page` is a read-only projection** that composes data from Projects, Tasks, Schedule, and Wiki. It must never write to the database.
4. **Three UI shells**, not per-page: Auth shell, App shell, Project shell. Composed via Next.js `layout.tsx`.
5. **Admin role overrides all module-level write rules.** Per MODULES.md, Admins have access to all operations even when not explicitly stated in the module.
6. **Module boundaries are enforced at the data layer.** Each upstream module exposes a small public interface; other modules (especially Home) read through those interfaces, never directly into the tables.

---

## 4. POC scope boundaries — do NOT build

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