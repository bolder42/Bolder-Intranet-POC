import Link from 'next/link';

import { SidebarToggle } from './sidebar-toggle';
import { ThemeToggle } from './theme-toggle';
import { UserAvatar } from '@/components/user/user-avatar';

export interface HeaderUser {
  name?: string | null;
  image?: string | null;
}

export interface HeaderProps {
  collapsed: boolean;
  onToggleSidebar: () => void;
  breadcrumbs?: string[];
  user?: HeaderUser | undefined;
}

/**
 * App-shell top bar: sidebar toggle, breadcrumbs (optional), theme toggle,
 * and the profile avatar (a link to /app/settings) at the far right — the
 * same identity shown in the sidebar workspace card and the floating
 * toolbar menu.
 */
export function Header({ collapsed, onToggleSidebar, breadcrumbs, user }: HeaderProps) {
  return (
    <header className="app-header">
      <div className="app-header-left">
        <SidebarToggle collapsed={collapsed} onToggle={onToggleSidebar} />
        <div className="app-header-breadcrumbs">
          {breadcrumbs && breadcrumbs.length > 0 ? (
            <nav aria-label="Breadcrumb">
              {breadcrumbs.map((crumb, index) => (
                <span key={`${crumb}-${index}`} className="breadcrumb">
                  {crumb}
                </span>
              ))}
            </nav>
          ) : null}
        </div>
      </div>

      <div className="app-header-actions">
        <ThemeToggle />
        <Link href="/app/settings" className="header-settings-link" aria-label="Open settings">
          <UserAvatar name={user?.name ?? 'User'} image={user?.image ?? null} size={40} />
        </Link>
      </div>
    </header>
  );
}
