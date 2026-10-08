'use client';

import type { Session } from 'next-auth';
import { SessionProvider } from 'next-auth/react';
import type { ReactNode } from 'react';

import { ThemeProvider } from './theme-provider';

export interface ProvidersProps {
  children: ReactNode;
  /** Server-provided session; when omitted, SessionProvider fetches it. */
  session?: Session | null | undefined;
}

/**
 * Client-side context providers for the app.
 * - Auth.js SessionProvider (used by useSession / signIn in client components).
 * - ThemeProvider handles light/dark/system mode and persistence.
 */
export function Providers({ children, session }: ProvidersProps) {
  const sessionProvider =
    session === undefined ? (
      <SessionProvider>{children}</SessionProvider>
    ) : (
      <SessionProvider session={session}>{children}</SessionProvider>
    );

  return <ThemeProvider>{sessionProvider}</ThemeProvider>;
}
