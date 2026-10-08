import { SidebarToggle } from './sidebar-toggle';
import { ThemeToggle } from './theme-toggle';

export interface HeaderProps {
  collapsed: boolean;
  onToggleSidebar: () => void;
  breadcrumbs?: string[];
}

/**
 * App-shell top bar: sidebar toggle, breadcrumbs (optional), and theme toggle.
 * User identity is shown in the sidebar workspace card and the floating
 * toolbar avatar menu, so the top bar stays chrome-only.
 */
export function Header({ collapsed, onToggleSidebar, breadcrumbs }: HeaderProps) {
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
      </div>
    </header>
  );
}