'use client';

import { PanelLeftIcon } from './icons';

export interface SidebarToggleProps {
  collapsed: boolean;
  onToggle: () => void;
}

/**
 * Button that toggles the app-shell sidebar open or closed.
 *
 * Rendered inside the top bar so it stays visible whether the sidebar
 * is expanded or hidden (the previous version lived inside .sidebar-wrapper
 * and disappeared with the sidebar on collapse, leaving no way to reopen).
 */
export function SidebarToggle({ collapsed, onToggle }: SidebarToggleProps) {
  return (
    <button
      type="button"
      className="sidebar-toggle"
      aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      aria-expanded={!collapsed}
      onClick={onToggle}
    >
      <PanelLeftIcon aria-hidden="true" />
    </button>
  );
}