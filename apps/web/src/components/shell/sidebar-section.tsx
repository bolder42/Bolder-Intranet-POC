'use client';

import { useState } from 'react';

import { ChevronRightIcon, MoreHorizontalIcon } from './icons';

export interface SidebarSectionProps {
  title?: string;
  defaultExpanded?: boolean;
  children?: React.ReactNode;
  actions?: React.ReactNode;
}

/**
 * Collapsible sidebar section used by the Anytype-style rail.
 * The chevron rotates when expanded; trailing actions sit beside the title
 * so action buttons are never nested inside the expand toggle.
 */
export function SidebarSection({
  title,
  defaultExpanded = true,
  children,
  actions,
}: SidebarSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="sidebar-section">
      {title ? (
        <div className="sidebar-section-header">
          <button
            type="button"
            className="sidebar-section-title"
            onClick={() => setExpanded((prev) => !prev)}
            aria-expanded={expanded}
          >
            <span className={`sidebar-chevron${expanded ? ' expanded' : ''}`}>
              <ChevronRightIcon />
            </span>
            <span>{title}</span>
          </button>
          {actions ? <div className="sidebar-section-actions">{actions}</div> : null}
        </div>
      ) : null}
      {expanded ? children : null}
    </div>
  );
}

export interface SidebarSectionActionProps {
  label: string;
}

export function SidebarSectionAction({ label }: SidebarSectionActionProps) {
  // Placeholder action button — visible on hover for symmetry with Anytype's
  // section chrome. Wire to a per-section menu when the relevant module ships.
  return (
    <button
      type="button"
      className="sidebar-toggle"
      aria-label={`${label} (placeholder)`}
      disabled
    >
      <MoreHorizontalIcon />
    </button>
  );
}
