import type { Project } from '@bolder/shared';
import Link from 'next/link';

import { Card, CardBody, CardHeader } from '@/components/ui';
import { api, getAuthHeaders } from '@/lib/api';

// TODO: replace with real data once the API is running.
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

export default async function ProjectsPage() {
  let projects = MOCK_PROJECTS;

  try {
    const headers = await getAuthHeaders();
    const response = await api.api.projects.$get({}, { headers });
    if (response.ok) {
      const data = (await response.json()) as unknown as { projects: Project[] };
      projects = data.projects;
    }
  } catch {
    // Backend not reachable — fall back to mock data.
  }

  return (
    <section>
      <h1>Projects</h1>
      <p className="stat-label">Every project you have access to.</p>

      <div className="project-list">
        {projects.map((project) => (
          <Link
            key={project.id}
            href={`/app/projects/${project.id}`}
            className="project-card-link"
          >
            <Card>
              <CardHeader>{project.name}</CardHeader>
              {project.description ? <CardBody>{project.description}</CardBody> : null}
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}