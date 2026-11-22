import { eq } from "drizzle-orm";
import { getDb, users } from "@bolder/db";

/**
 * Data-access for the current user's profile. The only file in this module
 * allowed to hit the DB (AGENTS.md §7: DB client imported by *.repo.ts).
 */
export const usersRepo = {
  findById(id: number) {
    return getDb().select().from(users).where(eq(users.id, id)).get();
  },

  /** Persists only the keys present in `patch`; returns the updated row. */
  updateMe(
    id: number,
    patch: { name?: string; image?: string | null },
  ) {
    const set: { name?: string; image?: string | null } = {};
    if (patch.name !== undefined) set.name = patch.name;
    if (patch.image !== undefined) set.image = patch.image;
    if (Object.keys(set).length === 0) return this.findById(id);
    return getDb().update(users).set(set).where(eq(users.id, id)).returning().get();
  },
};
