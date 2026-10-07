import type { HomeSummary } from '@bolder/shared';

import { auth } from '@/auth';
import { Card, CardBody, CardHeader } from '@/components/ui';
import { api, getAuthHeaders } from '@/lib/api';
import { getRoleLabel } from '@/lib/utils';

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
      content: '',
      authorId: null,
      updatedAt: Date.now(),
    },
    {
      id: 2,
      projectId: 1,
      title: 'Architecture decisions',
      content: '',
      authorId: null,
      updatedAt: Date.now(),
    },
  ],
  upcomingDeadlines: [],
};

export default async function HomePage() {
  const session = await auth();
  const me = session?.user;

  let summary = MOCK_SUMMARY;
  let isMock = true;

  try {
    const headers = await getAuthHeaders();
    const response = await api.api.home.summary.$get({}, { headers });
    if (response.ok) {
      summary = (await response.json()) as unknown as HomeSummary;
      isMock = false;
    }
  } catch {
    // Backend not reachable during POC development — keep mock data.
  }

  return (
    <section className="home">
      <h1>Welcome, {me?.name ?? me?.email ?? 'there'}</h1>
      <p className="stat-label">
        Signed in as {getRoleLabel(me?.role)}.
        {isMock ? ' Showing mock data (API not connected yet).' : null}
      </p>

      <div className="home-grid">
        <Card>
          <CardHeader>Projects</CardHeader>
          <CardBody>
            <p className="stat-value">{summary.projectCount}</p>
            <p className="stat-label">active projects</p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>Tasks</CardHeader>
          <CardBody>
            <p className="stat-value">{summary.overdueTaskCount}</p>
            <p className="stat-label">
              overdue of {summary.taskCount} task{summary.taskCount === 1 ? '' : 's'}
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>Recent Activity</CardHeader>
          <CardBody>
            {/* TODO: replace with real data from the Wiki module. */}
            <ul className="list-plain">
              {summary.recentWiki.map((page) => (
                <li key={page.id}>{page.title}</li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>
    </section>
  );
}