import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';

import { AppShell } from '@/components/shell/app-shell';

import { auth } from '@/auth';

import '@bolder/ui/styles.css';
import './app-shell.css';

/**
 * APP SHELL (one of the three locked UI shells).
 * Wraps every /app/* route with the sidebar + header chrome.
 *
 * The middleware is the primary auth guard; the `auth()` check here is
 * defense-in-depth (e.g. if the middleware matcher is ever changed).
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/login');
  }

  return <AppShell user={session.user}>{children}</AppShell>;
}
