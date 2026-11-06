import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { getDb, invites, users } from "@bolder/db";
import type { Invite, NewInvite, NewUser } from "@bolder/db";

export type InviteRow = Invite;

/**
 * Data-access for `invites`. The only file in this module allowed to hit the
 * DB. Invites are global (not partitioned by `project_id`), like `users`.
 */
export const invitesRepo = {
  /** Expects an already-normalized code (see `normalizeInviteCode`). */
  findByCode(code: string) {
    return getDb().select().from(invites).where(eq(invites.code, code)).get();
  },

  create(input: NewInvite) {
    return getDb().insert(invites).values(input).returning().get();
  },

  listAll() {
    return getDb().select().from(invites).orderBy(desc(invites.createdAt)).all();
  },

  findById(id: number) {
    return getDb().select().from(invites).where(eq(invites.id, id)).get();
  },

  /**
   * Revokes an invite only when it is neither used nor already revoked.
   * Returns the updated row, or `undefined` when nothing changed (used /
   * already revoked / unknown id).
   */
  markRevoked(id: number, at: number) {
    return getDb()
      .update(invites)
      .set({ revokedAt: at })
      .where(
        and(eq(invites.id, id), isNull(invites.usedAt), isNull(invites.revokedAt)),
      )
      .returning()
      .get();
  },

  /**
   * The single-use critical section. The conditional UPDATE doubles as the
   * atomic claim: two concurrent requests can never both observe
   * `changes > 0`, because SQLite serializes the transaction and the second
   * UPDATE matches no row. We therefore never read-then-write outside the
   * transaction.
   */
  claimAndCreateUser(input: { inviteId: number; now: number; user: NewUser }) {
    return getDb().transaction((tx) => {
      const claimed = tx
        .update(invites)
        .set({ usedAt: input.now })
        .where(
          and(
            eq(invites.id, input.inviteId),
            isNull(invites.usedAt),
            isNull(invites.revokedAt),
            gt(invites.expiresAt, input.now),
          ),
        )
        .run();

      if (claimed.changes === 0) return null;

      const user = tx.insert(users).values(input.user).returning().get();
      tx.update(invites)
        .set({ usedBy: user.id })
        .where(eq(invites.id, input.inviteId))
        .run();

      return { user };
    });
  },
};
