import type { NextConfig } from 'next';
import { resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';

/**
 * Load the monorepo root `.env` into `process.env` before Next.js evaluates
 * any server code. Next only auto-loads `.env*` from its own directory
 * (`apps/web/`), but the project's single source of truth lives at the repo
 * root alongside `.env.example`. Loading it here makes `AUTH_SECRET`,
 * `API_URL`, etc. visible to middleware, route handlers, and Auth.js.
 *
 * Safe to call repeatedly: dotenv does not overwrite existing process.env
 * entries, so a real `apps/web/.env.local` always wins over the root.
 */
loadEnv({ path: resolve(__dirname, '../../.env') });

/**
 * Next.js configuration for the Bolder Intranet frontend.
 *
 * `transpilePackages` lets Next compile the workspace packages from source
 * (they export raw TS/CSS rather than pre-built JS).
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  distDir: process.env.BOLDER_NEXT_DIST_DIR ?? '.next',
  transpilePackages: ['@bolder/ui', '@bolder/shared', '@bolder/db', '@bolder/auth'],
  webpack(config) {
    // Workspace sources use Node-compatible .js specifiers for TypeScript files.
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      '.js': ['.ts', '.tsx', '.js'],
    };
    return config;
  },
};

export default nextConfig;
