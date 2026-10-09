import type { ReactNode } from "react";
import { api, getAuthHeaders } from "@/lib/api";

import { ProjectHeader } from "@/components/shell/project-header";
import { ProjectNav } from "@/components/shell/project-nav";

export interface ProjectLayoutProps {
  children: ReactNode;
  /** Next.js 15: dynamic route params are async. */
  params: Promise<{ projectId: string }>;
}

/**
 * PROJECT SHELL (one of the three locked UI shells).
 * Created at the project route so Tasks / Wiki / Schedule inherit the same
 * header + tab navigation. Projects is the aggregate root: it is the only
 * shell that owns a `projectId` (AGENTS.md decision #2).
 */
export default async function ProjectLayout({ children, params }: ProjectLayoutProps) {
  const { projectId } = await params;
  try {
    const headers = await getAuthHeaders();
    const response = await api.api.projects[":projectId"].$get(
      { param: { projectId } },
      { headers },
    );
    if (!response.ok) return <p role="alert">Project unavailable or access denied.</p>;
  } catch {
    return <p role="alert">Unable to load this project. Check the API connection.</p>;
  }

  return (
    <section className="project-shell">
      <ProjectHeader projectId={projectId} />
      <ProjectNav projectId={projectId} />
      <div className="project-content">{children}</div>
    </section>
  );
}
