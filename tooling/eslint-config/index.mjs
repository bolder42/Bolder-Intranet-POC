import js from "@eslint/js";
import tseslint from "typescript-eslint";

/**
 * Shared ESLint flat config for the Bolder Intranet monorepo.
 *
 * Critical boundaries enforced here:
 *  - Direct access to the SQLite client is FORBIDDEN outside the data layer
 *    (packages-db source and apps-api-db source) and per-module repository
 *    files (apps-api modules repo files). All other code MUST go through
 *    the repository pattern.
 *  - Auth.js credentials / adapters are FORBIDDEN in the edge-safe
 *    auth.config.ts (it runs in the Edge runtime). They live in auth.ts
 *    under apps-web source, which runs on Node.
 */
export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { prefer: "type-imports", fixStyle: "separate-type-imports" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  {
    files: ["apps/api/src/modules/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/db/client", "@bolder/db/client"],
              message:
                "Module handlers must go through the *.repo.ts file in the same folder, not the raw DB client.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["apps/web/src/auth.config.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@auth/prisma-adapter",
                "next-auth/providers/credentials",
                "bcrypt",
                "bcryptjs",
                "@node-rs/argon2",
                "argon2",
                "@bolder/db",
                "@bolder/db/**",
              ],
              message:
                "auth.config.ts runs on the Edge runtime. Move Node-only imports (adapters, hashing, DB) into auth.ts.",
            },
          ],
        },
      ],
    },
  },
  {
    ignores: [
      "**/dist/**",
      "**/.next/**",
      "**/.next-build/**",
      "**/.turbo/**",
      "**/coverage/**",
      "**/node_modules/**",
      "**/*.d.ts",
      "drizzle/**",
      "apps/web/next-env.d.ts",
    ],
  },
];
