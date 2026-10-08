'use client';

import { useState } from 'react';

import { PlusIcon } from '@/components/shell/icons';

const TABS = ['This week', 'This month', 'All', 'Done'] as const;
type Tab = (typeof TABS)[number];

interface PlaceholderTask {
  id: number;
  name: string;
  dueDate: string;
  done: boolean;
}

const PLACEHOLDER_TASKS: PlaceholderTask[] = [
  { id: 1, name: 'Review project brief', dueDate: 'Today', done: false },
  { id: 2, name: 'Update onboarding wiki', dueDate: 'Tomorrow', done: false },
  { id: 3, name: 'Sync with design team', dueDate: 'Oct 12', done: true },
];

export interface TasksWidgetProps {
  totalCount: number;
}

/**
 * Tasks dashboard widget with filter chips and a mini table.
 *
 * Task counts come from the home summary; the table rows are placeholders
 * because the summary only exposes aggregate counts in the current API.
 *
 * Filter chips update visual state but do not yet filter rows — until the
 * tasks API exposes per-row data the chips are decorative. Rendered as a
 * plain button group (aria-pressed) rather than role="tablist" because
 * there is no associated tabpanel wiring.
 */
export function TasksWidget({ totalCount }: TasksWidgetProps) {
  const [activeTab, setActiveTab] = useState<Tab>('This week');

  return (
    <section aria-labelledby="tasks-title">
      <h2 id="tasks-title" className="widget-title">
        Tasks
      </h2>
      <div className="widget-tabs" role="group" aria-label="Task filters">
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
      <div className="widget-table" aria-label={`Tasks ${activeTab}`}>
        <div className="widget-table-header">
          <span>Name</span>
          <span>Due date</span>
        </div>
        {PLACEHOLDER_TASKS.map((task) => (
          <div key={task.id} className="widget-table-row">
            <input
              type="checkbox"
              className="widget-checkbox"
              defaultChecked={task.done}
              aria-label={`Mark ${task.name} as ${task.done ? 'not done' : 'done'}`}
            />
            <span style={{ textDecoration: task.done ? 'line-through' : undefined }}>
              {task.name}
            </span>
            <span className="widget-row-date">{task.dueDate}</span>
          </div>
        ))}
        {/* Placeholder add affordance — wired up once the Tasks module is implemented. */}
        <button type="button" className="widget-add-row" disabled aria-label="Create a new task (placeholder)">
          <PlusIcon width={16} height={16} />
          <span>New task</span>
        </button>
      </div>
      <p className="dashboard-meta" style={{ marginTop: 8 }}>
        {totalCount} task{totalCount === 1 ? '' : 's'} total
      </p>
    </section>
  );
}