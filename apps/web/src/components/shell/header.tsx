import { getRoleLabel } from '@/lib/utils';

export interface HeaderUser {
  name?: string | null;
  email?: string | null;
  role?: string | null;
}

export interface HeaderProps {
  user?: HeaderUser | null;
  breadcrumbs?: string[];
}

/**
 * App-shell top bar: breadcrumbs (optional) and the current user.
 */
export function Header({ user, breadcrumbs }: HeaderProps) {
  const displayName = user?.name ?? user?.email ?? 'Guest';

  return (
    <header className="app-header">
      <div className="app-header-breadcrumbs">
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <nav aria-label="Breadcrumb">
            {breadcrumbs.map((crumb) => (
              <span key={crumb} className="breadcrumb">
                {crumb}
              </span>
            ))}
          </nav>
        ) : null}
      </div>

      <div className="app-header-user">
        <span>{displayName}</span>
        <span className="role-badge">{getRoleLabel(user?.role)}</span>
      </div>
    </header>
  );
}
