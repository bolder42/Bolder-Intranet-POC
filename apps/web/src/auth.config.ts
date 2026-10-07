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
const authConfig = {
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
