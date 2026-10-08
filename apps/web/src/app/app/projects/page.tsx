import { ProjectListSchema, ProjectCandidatesSchema } from "@bolder/shared";
import Link from "next/link";
import { auth } from "@/auth";
import { Card, CardBody, CardHeader } from "@/components/ui";
import { ProjectForm } from "@/components/projects/project-form";
import { Participants } from "@/components/projects/participants";
import { api, getAuthHeaders } from "@/lib/api";
export default async function ProjectsPage() {
  const session = await auth();
  const canWrite = session?.user.role === "tech_lead" || session?.user.role === "admin";
  try {
    const headers = await getAuthHeaders();
    const response = await api.api.projects.$get({}, { headers });
    if (!response.ok) return <p role="alert">Unable to load projects. Please try again.</p>;
    const { projects } = ProjectListSchema.parse(await response.json());
    const candidatesResponse = canWrite
      ? await api.api.projects.candidates.$get({}, { headers })
      : null;
    const candidates = candidatesResponse?.ok
      ? ProjectCandidatesSchema.parse(await candidatesResponse.json()).users
      : [];
    return (
      <section>
        <h1>Projects</h1>
        <p className="stat-label">Every project you have access to.</p>
        {canWrite ? (
          <details className="project-create">
            <summary>Create project</summary>
            <ProjectForm candidates={candidates} />
          </details>
        ) : null}
        {!projects.length ? <p>No projects yet.</p> : null}
        <div className="project-list">
          {projects.map((project) => (
            <Card key={project.id}>
              <CardHeader>
                <Link href={`/app/projects/${project.id}`}>{project.name}</Link>
              </CardHeader>
              <CardBody>
                <p>{project.description || "No description yet."}</p>
                <p>
                  Final deadline:{" "}
                  {project.deadline === null
                    ? "Not set"
                    : new Date(project.deadline).toLocaleDateString("en-GB", { timeZone: "UTC" })}
                </p>
                <Participants members={project.members} />
              </CardBody>
            </Card>
          ))}
        </div>
      </section>
    );
  } catch {
    return <p role="alert">Unable to load projects. Check the API connection and try again.</p>;
  }
}
