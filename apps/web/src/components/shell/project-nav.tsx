'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

const TABS = [
  { segment: '/tasks', label: 'Tasks' },
  { segment: '/wiki', label: 'Wiki' },
  { segment: '/schedule', label: 'Schedule' },
] as const;

export interface ProjectNavProps {
  projectId: string;
}

/**
 * Project-shell tab navigation. Highlights the tab matching the current path.
 */
export function ProjectNav({ projectId }: ProjectNavProps) {
  const pathname = usePathname() ?? '';

  return (
    <nav className="project-nav" aria-label="Project sections">
      {TABS.map((tab) => {
        const href = `/app/projects/${projectId}${tab.segment}`;
        const isActive = pathname.startsWith(href);

        return (
          <Link
            key={tab.segment}
            href={href}
            className={cn('project-tab', isActive && 'project-tab-active')}
            aria-current={isActive ? 'page' : undefined}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
