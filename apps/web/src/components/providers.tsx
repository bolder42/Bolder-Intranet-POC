'use client';

import type { Session } from 'next-auth';
import { SessionProvider } from 'next-auth/react';
import type { ReactNode } from 'react';

export interface ProvidersProps {
  children: ReactNode;
  /** Server-provided session; when omitted, SessionProvider fetches it. */
  session?: Session | null | undefined;
}

/**
 * Client-side context providers for the app. Currently only Auth.js's
 * `SessionProvider` (used by `useSession` / `signIn` in client components).
 */
export function Providers({ children, session }: ProvidersProps) {
  // exactOptionalPropertyTypes: don't forward an explicit `undefined` prop.
  if (session === undefined) {
    return <SessionProvider>{children}</SessionProvider>;
  }

  return <SessionProvider session={session}>{children}</SessionProvider>;
}
