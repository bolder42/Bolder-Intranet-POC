import { runMigrations } from "@bolder/db";
import { getDb } from "./db/client.js";

runMigrations(getDb());
console.warn("[api] migrations applied");
