import { KanbanBoard } from "@/components/tasks/kanban-board";
import type { BoardMember } from "@/components/tasks/task-types";
import type { TaskListItem } from "@/components/tasks/task-types";
import { api, getAuthHeaders } from "@/lib/api";

export interface TasksPageProps {
  params: Promise<{ projectId: string }>;
}

/**
 * Tasks board page (PROJECT shell). Server component: fetches the task list
 * plus assignee candidates, then hands both to the client KanbanBoard.
 */
export default async function TasksPage({ params }: TasksPageProps) {
  const { projectId } = await params;

  try {
    const headers = await getAuthHeaders();
    const [tasksResponse, membersResponse] = await Promise.all([
      api.api.tasks[":projectId"].$get({ param: { projectId } }, { headers }),
      api.api.projects[":projectId"].members.$get({ param: { projectId } }, { headers }),
    ]);

    if (!tasksResponse.ok || !membersResponse.ok) {
      return (
        <section aria-label="Tasks board">
          <h1>Tasks</h1>
          <p role="alert">Tasks are unavailable or you do not have access.</p>
          <p>
            <a href={`/app/projects/${projectId}/tasks`}>Try again</a>
          </p>
        </section>
      );
    }

    const tasksData = (await tasksResponse.json()) as { tasks: TaskListItem[] };
    const membersData = (await membersResponse.json()) as { members: BoardMember[] };

    return (
      <KanbanBoard
        projectId={projectId}
        initialTasks={tasksData.tasks ?? []}
        members={membersData.members ?? []}
      />
    );
  } catch {
    return (
      <section aria-label="Tasks board">
        <h1>Tasks</h1>
        <p role="alert">Unable to load tasks. Check the API connection.</p>
        <p>
          <a href={`/app/projects/${projectId}/tasks`}>Try again</a>
        </p>
      </section>
    );
  }
}
