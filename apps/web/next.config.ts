import type { NextConfig } from 'next';

/**
 * Next.js configuration for the Bolder Intranet frontend.
 *
 * `transpilePackages` lets Next compile the workspace packages from source
 * (they export raw TS/CSS rather than pre-built JS).
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@bolder/ui', '@bolder/shared', '@bolder/db', '@bolder/auth'],
};

export default nextConfig;
