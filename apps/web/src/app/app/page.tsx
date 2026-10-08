import type { HomeSummary, Project } from '@bolder/shared';

import { auth } from '@/auth';
import {
  DashboardHeader,
  FloatingToolbar,
  NotesGrid,
  ProjectsWidget,
  QuickLinksCallout,
  TasksWidget,
} from '@/components/home';
import { api, getAuthHeaders } from '@/lib/api';

/**
 * HOME working stub.
 *
 * Demonstrates the full read-only pipeline: session from Auth.js → typed Hono
 * RPC call → render. Home is a READ-ONLY projection (AGENTS.md decision #3):
 * it only composes data, it never writes.
 *
 * TODO: replace the mock fallback with real data once the API is running.
 */
const MOCK_SUMMARY: HomeSummary = {
  projectCount: 3,
  taskCount: 7,
  overdueTaskCount: 2,
  recentWiki: [
    {
      id: 1,
      projectId: 1,
      title: 'Onboarding guide',
      content:
        'Welcome to Bolder! This guide covers the basics of navigating the intranet, finding projects, and contributing to the wiki.',
      authorId: null,
      updatedAt: Date.now(),
    },
    {
      id: 2,
      projectId: 1,
      title: 'Architecture decisions',
      content:
        'A living record of the technical choices behind the intranet POC, including the three UI shells and module boundaries.',
      authorId: null,
      updatedAt: Date.now(),
    },
    {
      id: 3,
      projectId: 2,
      title: 'Q4 roadmap',
      content: '',
      authorId: null,
      updatedAt: Date.now(),
    },
  ],
  upcomingDeadlines: [],
};

const MOCK_PROJECTS: Project[] = [
  {
    id: 1,
    name: 'Bolder Intranet',
    description: 'Company intranet POC.',
    createdBy: null,
    createdAt: Date.now(),
  },
  {
    id: 2,
    name: 'Website Refresh',
    description: 'Marketing site refresh.',
    createdBy: null,
    createdAt: Date.now(),
  },
];

export default async function HomePage() {
  const session = await auth();
  const me = session?.user;

  let summary = MOCK_SUMMARY;
  let isMock = true;

  try {
    const headers = await getAuthHeaders();
    const response = await api.api.home.summary.$get({}, { headers });
    if (response.ok) {
      // TODO: validate against HomeSummarySchema before using — the runtime
      // type from response.json() is `unknown`, and the Hono RPC chain only
      // gives us compile-time guarantees. Schema.parse catches drift.
      summary = (await response.json()) as unknown as HomeSummary;
      isMock = false;
    }
  } catch {
    // Backend not reachable during POC development — keep mock data.
  }

  let projects = MOCK_PROJECTS;
  try {
    const headers = await getAuthHeaders();
    const response = await api.api.projects.$get({}, { headers });
    if (response.ok) {
      // TODO: validate against the projects response schema before using.
      const data = (await response.json()) as unknown as { projects: Project[] };
      projects = data.projects;
    }
  } catch {
    // Backend not reachable — fall back to mock projects.
  }

  return (
    <>
      <section className="dashboard">
        <DashboardHeader userName={me?.name ?? me?.email ?? 'there'} />

        <QuickLinksCallout />

        <div className="dashboard-zone">
          <div className="dashboard-zone-column">
            <TasksWidget totalCount={summary.taskCount} />
          </div>
          <div className="dashboard-zone-column">
            <ProjectsWidget count={summary.projectCount} projects={projects} />
          </div>
        </div>

        <NotesGrid pages={summary.recentWiki} />

        {isMock ? (
          <p className="dashboard-meta" style={{ marginTop: 48 }}>
            Showing mock data — the API is not connected yet.
          </p>
        ) : null}
      </section>

      <FloatingToolbar
        userName={me?.name ?? me?.email ?? 'User'}
        userRole={me?.role ?? null}
      />
    </>
  );
}
