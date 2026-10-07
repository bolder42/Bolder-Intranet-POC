import Link from 'next/link';

import { api } from '@/lib/api';

export interface ProjectHeaderProps {
  projectId: string;
}

/**
 * Project-shell header. Shows the project name and a link back to the list.
 * Fetches through the typed Hono RPC client (never the DB — locked decision #6).
 */
export async function ProjectHeader({ projectId }: ProjectHeaderProps) {
  let name = `Project ${projectId}`;

  try {
    const response = await api.api.projects[':projectId'].$get({ param: { projectId } });
    if (response.ok) {
      const data = (await response.json()) as unknown as {
        project: { name: string } | null;
      } | null;
      if (data?.project?.name) name = data.project.name;
    }
  } catch {
    // Backend not reachable (POC dev): fall back to the id-based name.
  }

  return (
    <header className="project-header">
      <Link href="/app/projects" className="project-back">
        &larr; All projects
      </Link>
      <h1 className="project-title">{name}</h1>
    </header>
  );
}