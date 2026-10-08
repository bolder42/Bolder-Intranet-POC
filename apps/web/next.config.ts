import type { NextConfig } from 'next';

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
