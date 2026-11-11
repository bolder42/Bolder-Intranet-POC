import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';

import type { UserProfile } from '@bolder/shared';

import { AppShell } from '@/components/shell/app-shell';
import { getProfileAction } from '@/components/settings/settings-actions';

import { auth } from '@/auth';

import '@bolder/ui/styles.css';
import './app-shell.css';

/**
 * APP SHELL (one of the three locked UI shells).
 * Wraps every /app/* route with the sidebar + header chrome.
 *
 * The middleware is the primary auth guard; the `auth()` check here is
 * defense-in-depth (e.g. if the middleware matcher is ever changed).
 *
 * The profile shown in the sidebar is fetched fresh from the API (with a
 * session fallback) so display-name / photo changes made on /app/settings
 * appear without signing out and back in.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/login');
  }

  const profile: UserProfile | null = await getProfileAction();
  const user = profile ?? {
    name: session.user.name ?? null,
    email: session.user.email ?? null,
    role: session.user.role ?? 'dev',
    image: null,
  };

  return <AppShell user={user}>{children}</AppShell>;
}
