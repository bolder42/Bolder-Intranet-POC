'use client';

import { useState } from 'react';

import type { Project } from '@bolder/shared';

import { PlusIcon } from '@/components/shell/icons';

const TABS = ['Active', 'Archived', 'All'] as const;
type Tab = (typeof TABS)[number];

const PLACEHOLDER_PROJECTS: Pick<Project, 'id' | 'name'>[] = [
  { id: 1, name: 'Bolder Intranet' },
  { id: 2, name: 'Website Refresh' },
];

export interface ProjectsWidgetProps {
  count: number;
  projects?: Pick<Project, 'id' | 'name'>[];
}

/**
 * Projects dashboard widget with filter chips and a project list.
 *
 * Project status is intentionally not displayed yet — the home summary does
 * not expose it, and faking status from IDs would mislead reviewers. Rows are
 * plain links to the project shell.
 *
 * Filter chips update visual state but do not yet filter rows — until the
 * projects API exposes per-project status the chips are decorative. Rendered
 * as a plain button group (aria-pressed) rather than role="tablist".
 */
export function ProjectsWidget({ count, projects }: ProjectsWidgetProps) {
  const [activeTab, setActiveTab] = useState<Tab>('Active');
  const rows = projects ?? PLACEHOLDER_PROJECTS;

  return (
    <section aria-labelledby="projects-title">
      <h2 id="projects-title" className="widget-title">
        Projects
      </h2>
      <div className="widget-tabs" role="group" aria-label="Project filters">
        {TABS.map((tab) => {
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              aria-pressed={active}
              className={['widget-tab', active ? 'active' : ''].join(' ')}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          );
        })}
      </div>
      <div className="widget-list" aria-label={`Projects ${activeTab}`}>
        {rows.map((project) => (
          <a
            key={project.id}
            href={`/app/projects/${project.id}`}
            className="widget-list-row"
          >
            <span>{project.name}</span>
          </a>
        ))}
        {/* Placeholder add affordance — wired up once the Projects module exposes creation. */}
        <button
          type="button"
          className="widget-add-row"
          disabled
          aria-label="Create a new project (placeholder)"
        >
          <PlusIcon width={16} height={16} />
          <span>New project</span>
        </button>
      </div>
      <p className="dashboard-meta" style={{ marginTop: 8 }}>
        {count} project{count === 1 ? '' : 's'} total
      </p>
    </section>
  );
}