// Re-export the singleton database accessor from the data layer so that
// migrations, the seed script and the running app all share one connection.
export { createDb, getDb } from "@bolder/db/client";
export type { Db } from "@bolder/db/client";
