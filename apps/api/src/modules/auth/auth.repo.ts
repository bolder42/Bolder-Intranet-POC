import { eq } from "drizzle-orm";
import { getDb, users } from "@bolder/db";
import type { NewUser } from "@bolder/db";

/** Data-access for `users`. The only file in this module allowed to hit the DB. */
export const usersRepo = {
  findByEmail(email: string) {
    return getDb().select().from(users).where(eq(users.email, email)).get();
  },

  findById(id: number) {
    return getDb().select().from(users).where(eq(users.id, id)).get();
  },

  create(input: NewUser) {
    return getDb().insert(users).values(input).returning().get();
  },
};
