import { eq } from "drizzle-orm";
import { getDb, users } from "@bolder/db";

/**
 * Data-access for `users`. The only file in this module allowed to hit the DB.
 *
 * There is deliberately no `create` here: registration inserts the user inside
 * `invitesRepo.claimAndCreateUser`'s transaction so that claiming the invite
 * and creating the account are one atomic operation.
 */
export const usersRepo = {
  findByEmail(email: string) {
    return getDb().select().from(users).where(eq(users.email, email)).get();
  },

  findById(id: number) {
    return getDb().select().from(users).where(eq(users.id, id)).get();
  },
};
