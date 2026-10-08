import type { AuthResponse, Role } from '@bolder/shared';
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

import authConfig from './auth.config';

/**
 * Node-runtime Auth.js instance.
 *
 * The Credentials provider delegates authentication to the Hono API
 * (`POST {API_URL}/api/auth/verify`). The API returns `{ user, token }`, where
 * `token` is the backend's own HS256 JWT. We keep that token in the Auth.js
 * session so the frontend can authenticate its API calls — the frontend never
 * touches the database (AGENTS.md locked decision #6).
 */
const VERIFY_URL = `${process.env.API_URL ?? 'http://localhost:3001'}/api/auth/verify`;

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = typeof credentials?.email === 'string' ? credentials.email : '';
        const password = typeof credentials?.password === 'string' ? credentials.password : '';
        if (!email || !password) return null;

        const response = await fetch(VERIFY_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        if (!response.ok) return null;

        const data = (await response.json()) as AuthResponse;

        return {
          // Auth.js expects a string id; the backend uses numeric ids.
          id: String(data.user.id),
          name: data.user.name,
          email: data.user.email,
          role: data.user.role,
          apiToken: data.token,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    jwt({ token, user }) {
      // On initial sign-in, persist role + backend token in the encrypted JWT.
      // `user` is `User | AdapterUser`, so narrow to the augmented fields.
      if (user) {
        const u = user as { role?: Role; apiToken?: string };
        if (u.role) token.role = u.role;
        if (u.apiToken) token.apiToken = u.apiToken;
      }
      return token;
    },
    session({ session, token }) {
      // `token` comes from @auth/core/jwt; narrow its augmented fields.
      const t = token as { sub?: string; role?: Role; apiToken?: string };
      if (t.sub) {
        session.user.id = t.sub;
      }
      session.user.role = t.role ?? 'dev';
      session.user.apiToken = t.apiToken ?? '';
      return session;
    },
  },
});