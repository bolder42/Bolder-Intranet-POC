import Link from 'next/link';

import { signOutAction } from '@/app/actions';
import { getRoleLabel } from '@/lib/utils';

import {
  ClockIcon,
  DashboardGridIcon,
  FileTextIcon,
  FolderIcon,
} from './icons';
import { SidebarSection, SidebarSectionAction } from './sidebar-section';

export interface SidebarUser {
  name?: string | null;
  email?: string | null;
  role?: string | null;
}

export interface SidebarProps {
  user: SidebarUser;
}

function WorkspaceCard({ user }: { user: SidebarUser }) {
  const displayName = user.name ?? user.email ?? 'Workspace';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="workspace-card">
      <div className="workspace-avatar">{initial}</div>
      <div className="workspace-meta">
        <span className="workspace-name">{displayName}</span>
        <span className="workspace-role">{getRoleLabel(user.role)}</span>
      </div>
    </div>
  );
}

function SidebarRow({
  href,
  icon,
  label,
  active = false,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className="sidebar-row"
      aria-current={active ? 'page' : undefined}
    >
      <span className="sidebar-row-icon">{icon}</span>
      <span className="sidebar-row-label">{label}</span>
    </Link>
  );
}



/**
 * App-shell sidebar (server component).
 *
 * The layout follows Anytype's rail design: a workspace card, grouped
 * sections, and a sticky footer. Placeholder rows are clearly marked;
 * they represent concepts that already exist in the POC (Tasks, Wiki,
 * Schedule) without inventing new backend features.
 */
export function Sidebar({ user }: SidebarProps) {
  return (
    <aside className="sidebar" aria-label="App navigation">
      <WorkspaceCard user={user} />

      <SidebarRow href="/app" icon={<DashboardGridIcon />} label="Dashboard" active />

      <SidebarSection
        title="Projects"
        defaultExpanded
        actions={<SidebarSectionAction label="Project options" />}
      >
        {/* Placeholder project rows — the POC has a Projects module, but the
            sidebar does not fetch it to keep the server component synchronous. */}
        <SidebarRow href="/app/projects" icon={<FolderIcon />} label="All projects" />
        <SidebarRow
          href="/app/projects/1/tasks"
          icon={<FileTextIcon />}
          label="Bolder Intranet"
        />
        <SidebarRow href="/app/projects/2/tasks" icon={<FileTextIcon />} label="Website Refresh" />
      </SidebarSection>

      <SidebarSection
        title="Recent"
        defaultExpanded
        actions={<SidebarSectionAction label="Recent options" />}
      >
        {/* Placeholder recent rows mirroring existing project shells. */}
        <SidebarRow href="/app/projects/1/tasks" icon={<ClockIcon />} label="Tasks" />
        <SidebarRow href="/app/projects/1/wiki" icon={<ClockIcon />} label="Wiki" />
        <SidebarRow href="/app/projects/1/schedule" icon={<ClockIcon />} label="Schedule" />
      </SidebarSection>

      <div className="sidebar-footer">
        {/* Placeholder — opens the widget customiser once widget composition exists. */}
        <button
          type="button"
          className="sidebar-edit-widgets"
          disabled
          aria-label="Edit widgets (placeholder)"
        >
          Edit widgets
        </button>
      </div>

      <div className="sidebar-user">
        <form action={signOutAction} className="sidebar-user-row">
          <button type="submit" className="sidebar-signout">
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
