import Link from 'next/link';

import { signOutAction } from '@/app/actions';
import { getRoleLabel } from '@/lib/utils';

export interface SidebarUser {
  name?: string | null;
  email?: string | null;
  role?: string | null;
}

export interface SidebarProps {
  user: SidebarUser;
}

/**
 * App-shell sidebar (server component). Navigation + current user + sign out.
 */
export function Sidebar({ user }: SidebarProps) {
  const displayName = user.name ?? user.email ?? 'User';

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <Link href="/app">Bolder</Link>
      </div>

      <nav className="sidebar-nav" aria-label="Primary">
        <Link href="/app" className="sidebar-link">
          Home
        </Link>
        <Link href="/app/projects" className="sidebar-link">
          Projects
        </Link>
      </nav>

      <div className="sidebar-user">
        <span className="sidebar-user-name">{displayName}</span>
        <span className="role-badge">{getRoleLabel(user.role)}</span>
        <form action={signOutAction}>
          <button type="submit" className="sidebar-signout">
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
