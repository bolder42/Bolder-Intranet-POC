import { ProjectDetailSchema } from "@bolder/shared";
import Link from "next/link";
import { auth } from "@/auth";
import { Card, CardBody, CardHeader } from "@/components/ui";
import { ProjectForm } from "@/components/projects/project-form";
import { Participants } from "@/components/projects/participants";
import { api, getAuthHeaders } from "@/lib/api";
export interface ProjectPageProps {
  params: Promise<{ projectId: string }>;
}
export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = await params;
  const session = await auth();
  try {
    const headers = await getAuthHeaders();
    const response = await api.api.projects[":projectId"].$get(
      { param: { projectId } },
      { headers },
    );
    if (!response.ok) return <p role="alert">Project unavailable or access denied.</p>;
    const { project, members } = ProjectDetailSchema.parse(await response.json());
    return (
      <section>
        <Card>
          <CardHeader>Overview</CardHeader>
          <CardBody>
            <p>{project.description || "No description yet."}</p>
            <div className="project-overview-stats">
              <p>
                Final deadline
                <br />
                <strong>
                  {project.deadline === null
                    ? "Not set"
                    : new Date(project.deadline).toLocaleDateString("en-GB", { timeZone: "UTC" })}
                </strong>
              </p>
              <p>
                Created
                <br />
                <strong>
                  {new Date(project.createdAt).toLocaleDateString("en-GB", { timeZone: "UTC" })}
                </strong>
              </p>
              <p>
                Team
                <br />
                <strong>{members.length} participants</strong>
              </p>
            </div>
            <Participants members={members} />
          </CardBody>
        </Card>
        <div className="project-module-links">
          {[
            ["tasks", "Tasks", "Track work and progress."],
            ["wiki", "Wiki", "Find documentation and references."],
            ["schedule", "Schedule", "View milestones and deadlines."],
          ].map(([path, title, description]) => (
            <Link key={path} href={`/app/projects/${projectId}/${path}`}>
              <strong>{title}</strong>
              <p>{description}</p>
            </Link>
          ))}
        </div>
        {session?.user.role === "tech_lead" || session?.user.role === "admin" ? (
          <details>
            <summary>Edit project</summary>
            <ProjectForm project={project} />
          </details>
        ) : null}
      </section>
    );
  } catch {
    return <p role="alert">Unable to load this project. Please try again.</p>;
  }
}
