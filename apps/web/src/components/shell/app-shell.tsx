'use client';

import type { ReactNode } from 'react';

import { useLocalStorage } from '@/hooks/use-local-storage';

import { Header } from './header';
import { Sidebar } from './sidebar';

export interface AppShellUser {
  name?: string | null;
  email?: string | null;
  role?: string | null;
}

export interface AppShellProps {
  user: AppShellUser;
  children: ReactNode;
}

/**
 * Client wrapper for the app shell. Manages the collapsible sidebar state
 * and renders the shared chrome around page content. The toggle lives in
 * the top bar (via Header) so it stays reachable whether the sidebar is
 * expanded or collapsed.
 */
export function AppShell({ user, children }: AppShellProps) {
  const [collapsed, setCollapsed] = useLocalStorage('sidebar-collapsed', false);

  return (
    <div className="app-shell" data-sidebar-collapsed={collapsed ? 'true' : 'false'}>
      <div className="sidebar-wrapper">
        <Sidebar user={user} />
      </div>
      <div className="app-main">
        <Header
          collapsed={collapsed}
          onToggleSidebar={() => setCollapsed((prev) => !prev)}
        />
        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}