import NextAuth from 'next-auth';

import authConfig from './auth.config';

/**
 * Edge middleware. It builds a lightweight Auth.js instance from the
 * edge-safe config only — importing `./auth` here would pull in the
 * Credentials provider and Node-only code into the Edge bundle.
 */
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..+).*)'],
};
