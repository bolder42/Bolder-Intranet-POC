import base from "@repo/eslint-config";

export default [
  ...base,
  {
    ignores: [
      "**/dist/**",
      "**/.next/**",
      "**/.next-build/**",
      "**/.turbo/**",
      "**/coverage/**",
      "**/node_modules/**",
      "**/*.d.ts",
    ],
  },
];
