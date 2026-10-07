// Re-export the Drizzle Kit config owned by the data layer so tooling that
// looks for `apps/api/drizzle.config.ts` resolves the same settings.
export { default } from "@bolder/db/drizzle.config";
