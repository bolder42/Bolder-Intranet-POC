import { ProjectSchema, ScheduleListSchema } from "@bolder/shared";
import { auth } from "@/auth";
import { ScheduleView } from "@/components/schedule";
import { api, getAuthHeaders } from "@/lib/api";

export interface SchedulePageProps {
  params: Promise<{ projectId: string }>;
}

/**
 * Schedule landing page for a project (PROJECT shell).
 *
 * Reads through the typed Hono RPC client only — never the DB (locked decision
 * #6). The project's own final deadline is composed here from the Projects
 * module's public endpoint rather than reaching across module boundaries.
 */
export default async function SchedulePage({ params }: SchedulePageProps) {
  const { projectId } = await params;
  const session = await auth();

  try {
    const headers = await getAuthHeaders();
    const [projectResponse, scheduleResponse] = await Promise.all([
      api.api.projects[":projectId"].$get({ param: { projectId } }, { headers }),
      api.api.schedule[":projectId"].$get({ param: { projectId } }, { headers }),
    ]);

    if (!scheduleResponse.ok) {
      return <p role="alert">Schedule unavailable or access denied.</p>;
    }

    const { items } = ScheduleListSchema.parse(await scheduleResponse.json());

    let deadline: number | null = null;
    if (projectResponse.ok) {
      const data = (await projectResponse.json()) as { project: unknown };
      const parsedProject = ProjectSchema.safeParse(data.project);
      if (parsedProject.success) deadline = parsedProject.data.deadline ?? null;
    }

    const canWrite = session?.user.role === "tech_lead" || session?.user.role === "admin";
    const today = new Date().toISOString().slice(0, 10);

    return (
      <section>
        {deadline !== null ? (
          <p className="schedule-deadline">
            <span className="schedule-deadline-label">Project final deadline</span>
            <strong>{new Date(deadline).toLocaleDateString("en-GB", { timeZone: "UTC" })}</strong>
          </p>
        ) : null}

        <ScheduleView projectId={projectId} items={items} today={today} canWrite={canWrite} />
      </section>
    );
  } catch {
    return <p role="alert">Unable to load the schedule. Please try again.</p>;
  }
}
