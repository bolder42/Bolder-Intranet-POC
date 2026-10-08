import { defineConfig } from "vitest/config";

/**
 * Shared Vitest config. Each package extends this via `mergeConfig`.
 *
 * Use:
 *   import { defineProject, mergeConfig } from "vitest/config";
 *   import shared from "@repo/vitest-config";
 *   export default mergeConfig(shared, defineProject({ test: { name: "db" } }));
 */
export default defineConfig({
  test: {
    globals: true,
    restoreMocks: true,
    clearMocks: true,
  },
});