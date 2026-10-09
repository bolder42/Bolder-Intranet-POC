import type { NextAuthConfig } from 'next-auth';

/**
 * Edge-safe Auth.js configuration.
 *
 * This module is imported by `middleware.ts`, which runs in the Edge runtime.
 * It MUST NOT import anything Node-only (Credentials provider, hashing libs,
 * `@bolder/db`, ...). The lint config forbids those imports here.
 *
 * The Node-runtime pieces (the Credentials provider that talks to the API)
 * live in `auth.ts`, which spreads this config.
 */

/**
 * Resolve `AUTH_SECRET` from process.env. The root `.env` is loaded by
 * `apps/web/next.config.ts` before the app code runs, so this should be
 * populated for any normal `pnpm dev` / `next start`. We read it explicitly
 * (instead of relying on NextAuth's implicit `process.env.AUTH_SECRET` lookup)
 * so the failure mode is a clear, actionable error pointing at the env
 * setup rather than Auth.js's generic "MissingSecret" message.
 */
const AUTH_SECRET = process.env.AUTH_SECRET;
if (!AUTH_SECRET) {
  throw new Error(
    '[auth] AUTH_SECRET is not set. Copy .env.example to .env at the repo ' +
      'root and replace the AUTH_SECRET placeholder. See README.md.',
  );
}

// Dev-time guardrail: warn (don't throw) if AUTH_SECRET is still the
// .env.example placeholder, which would mean the cloner copied the
// example but forgot to generate a real secret. Sessions would technically
// work, but they'd be effectively public. The check is exact-match against
// the known placeholder string — if the example is ever reworded, this
// degrades to a no-op (safe).
if (
  process.env.NODE_ENV !== 'production' &&
  AUTH_SECRET === 'replace-me-with-a-long-random-string'
) {
  console.warn(
    '[auth] AUTH_SECRET is still the .env.example placeholder. ' +
      'Generate a real secret with `openssl rand -base64 32` and update .env.',
  );
}

const authConfig = {
  secret: AUTH_SECRET,
  pages: {
    signIn: '/auth/login',
  },
  session: {
    strategy: 'jwt',
  },
  // Providers are added in `auth.ts` (Node runtime). Edge config stays empty.
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      // NOTE: `!!auth?.user`, not `!!auth` — an empty auth object can be truthy.
      // See GHSA-8fpg-xm3f-6cx3 (fixed in next-auth 5.0.0-beta.32).
      const isLoggedIn = !!auth?.user;
      const isOnApp = nextUrl.pathname.startsWith('/app');
      const isOnAuth = nextUrl.pathname.startsWith('/auth');

      if (isOnApp) {
        // Unauthenticated visitors to /app/* are sent to the sign-in page.
        return isLoggedIn;
      }

      if (isOnAuth && isLoggedIn) {
        // Already signed in: don't show the auth pages again.
        return Response.redirect(new URL('/app', nextUrl));
      }

      return true;
    },
  },
} satisfies NextAuthConfig;

export default authConfig;
