# Deferred work and known limitations

Things that are deliberately **not** done, and issues **accepted** for the POC.

This file exists so deferrals don't live only in a PR description or in someone's memory. It is not a roadmap — everything here is either out of POC scope or a known, consciously accepted gap.

- For what each module _is_, see [`MODULES.md`](./MODULES.md).
- For what is deliberately **out of scope and must not be built**, see `AGENTS.md` §6.
- This file records what was deferred _during implementation_ and what is knowingly imperfect.

When you defer something, add it here in the same change (`AGENTS.md` §3). When you ship it, delete the entry.

---

## Deferred features

### Admin front-end for invitations

|                                |                                                                                                                                                                                                                 |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What**                       | A page to generate, list, and revoke invite codes from the UI.                                                                                                                                                  |
| **Status**                     | Not built. Deliberate decision.                                                                                                                                                                                 |
| **Why**                        | The capability exists and is fully tested at the API layer; only the screen is missing. Building it was explicitly descoped to keep the POC focused.                                                            |
| **How codes are minted today** | `pnpm --filter @bolder/api invite --role <role> --days <1-365>`<br>Add `--created-by <email>` to attribute the invite to a specific admin (defaults to the first admin).                                        |
| **What exists already**        | `POST /api/invites` (admin), `GET /api/invites` (admin), `POST /api/invites/:id/revoke` (admin), `POST /api/invites/validate` (public). All admin endpoints are guarded by `requireGlobalRole(ctx, ["admin"])`. |
| **If you build it**            | Put it under the **App shell** as `/app/settings/invites` — do not create a fourth UI shell (`AGENTS.md` §5.4). Add an admin-only `layout.tsx` guard; no route-level role guard exists yet.                     |

---

## Known limitations

Accepted for a localhost POC. Each one is a real gap, not a nit.

### No rate limiting on the unauthenticated endpoints

- **Where**: `POST /api/invites/validate`, `POST /api/auth/register`, `POST /api/auth/verify`.
- **Exposure**: unlimited attempts against an 8-character code over a 30-character alphabet (≈6.6×10¹¹ combinations, ≈39 bits). At a sustained 100 req/s the expected time to hit a specific invite is measured in years, so this is not a realistic threat _today_. It becomes real if codes get shorter, invites are plentiful, or the app is exposed publicly.
- **If you harden it**: raise `INVITE_CODE_LENGTH` to 10 (≈49 bits) in `apps/api/src/modules/invites/invite-code.ts`, and add a per-IP throttle on `/validate` and `/register`. Single-process deployment makes an in-memory limiter sufficient.

### Backend JWTs never expire

- **Where**: `apps/api/src/modules/auth/auth.service.ts` — the payload is `{ sub, role }` with no `exp`.
- **Cause**: **pre-existing**, not introduced by the invites work.
- **Consequence**: a leaked token is valid forever.
- **Mitigation already present**: `middleware/auth.ts` re-reads the user from the database on every request, so **deleting a user revokes access immediately**, and authorization uses the _database_ role rather than the token's `role` claim, so role changes also take effect immediately.
- **Note**: `JWT_SECRET` defaults to `dev-insecure-secret-change-me` in `apps/api/src/env.ts`. Anyone can forge an admin token if that default survives into a shared environment.

### Invites are not bound to an email address

By decision (see `MODULES.md` → Invitations). Whoever holds a valid code can redeem it. There is no way to say "this invite is only for `ana@company.com`".

### Deleting a user deletes their invite history

- **Where**: `packages/db/src/schema/invites.ts` — `created_by` uses `onDelete: "cascade"`.
- **Why it's inconsistent**: the same file's comment says invite rows are kept for audit. Deleting an admin currently wipes the invites that admin created.
- **Impact today**: none — the app has no user-deletion feature.
- **If it matters later**: change to `onDelete: "set null"` (requires `createdBy` to become nullable) or `restrict`, via a new Drizzle migration.

### Single-process assumption

`invitesRepo.claimAndCreateUser` is atomic because it relies on SQLite's write lock plus a conditional `UPDATE`. Running multiple API processes against the same database file still preserves single-use semantics, but better-sqlite3's default 5s `busy_timeout` can start throwing `SQLITE_BUSY` under write contention.

### Redundant index on `invites.code`

`invites_code_idx` duplicates the index already implied by the `UNIQUE` constraint on `code`. Harmless; left alone rather than generating a migration for cosmetics.

---

## Repository hygiene (pre-existing, not introduced here)

These were true on `develop` before this work and were intentionally left untouched to keep diffs reviewable.

- **`pnpm format:check` fails repo-wide** (~85 files). There is no `.prettierignore`. Files authored in this branch are formatted; unrelated files were not reformatted.
- **`turbo run test/typecheck` emit "no output files found" warnings** because those tasks declare no `outputs`. Cosmetic, but it defeats remote caching for them.
- **`turbo.json` `globalEnv` omits `JWT_SECRET` and `API_PORT`**, which can produce stale cache hits if those values change. `WEB_ORIGIN`-equivalent CORS config reuses `NEXTAUTH_URL`, which _is_ listed.
