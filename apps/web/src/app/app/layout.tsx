import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';

import { Header } from '@/components/shell/header';
import { Sidebar } from '@/components/shell/sidebar';

import { auth } from '@/auth';

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

  return (
    <div className="app-shell">
      <Sidebar user={session.user} />
      <div className="app-main">
        <Header user={session.user} />
        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}