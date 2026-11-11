import { asc, eq } from "drizzle-orm";
import { getDb, projectMembers, scopedByProject, taskStatusEvents, tasks, users } from "@bolder/db";
import {
  ApiError,
  ErrorCode,
  type Task,
  type TaskEvent,
  type TaskListItem,
  type TaskPriority,
  type TaskStatus,
} from "@bolder/shared";

/** Task columns returned by every task read (the frozen `TaskListItem` base). */
const TASK_COLUMNS = {
  id: tasks.id,
  projectId: tasks.projectId,
  title: tasks.title,
  description: tasks.description,
  status: tasks.status,
  priority: tasks.priority,
  assigneeId: tasks.assigneeId,
  dueAt: tasks.dueAt,
  createdAt: tasks.createdAt,
} as const;

/** Public user shape — mirrors what `projects` exposes, never password hashes. */
const ASSIGNEE_COLUMNS = {
  id: users.id,
  name: users.name,
  email: users.email,
  role: users.role,
} as const;

/** Event columns returned by the audit-trail read. */
const EVENT_COLUMNS = {
  id: taskStatusEvents.id,
  taskId: taskStatusEvents.taskId,
  projectId: taskStatusEvents.projectId,
  fromStatus: taskStatusEvents.fromStatus,
  toStatus: taskStatusEvents.toStatus,
  changedById: taskStatusEvents.changedById,
  changedAt: taskStatusEvents.changedAt,
} as const;

/** Everything needed to insert a task row that is not derived by the DB. */
export type TaskCreateValues = {
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: number | null;
  dueAt: number | null;
};

/** Explicit `null` clears the column; `undefined` leaves it untouched. */
export type TaskUpdatePatch = {
  title?: string;
  description?: string | null;
  priority?: TaskPriority;
  assigneeId?: number | null;
  dueAt?: number | null;
};

function findWithAssignee(projectId: number, taskId: number): TaskListItem | undefined {
  const row = getDb()
    .select({ task: TASK_COLUMNS, assignee: ASSIGNEE_COLUMNS })
    .from(tasks)
    .leftJoin(users, eq(users.id, tasks.assigneeId))
    .where(scopedByProject(tasks, projectId, eq(tasks.id, taskId)))
    .get();
  return row ? { ...row.task, assignee: row.assignee } : undefined;
}

function requireWithAssignee(projectId: number, taskId: number): TaskListItem {
  const task = findWithAssignee(projectId, taskId);
  if (!task) throw new ApiError(ErrorCode.INTERNAL, "Task vanished after the write.");
  return task;
}

/**
 * Data-access for `tasks` and `task_status_events`.
 *
 * EVERY query goes through `scopedByProject` — the partitioning convention
 * described in INFRA.md §6. The status-event row is written in the same
 * transaction as the status change so the audit trail can never drift from
 * the board.
 */
export const tasksRepo = {
  /** Tasks of one project, oldest first. */
  list(projectId: number): TaskListItem[] {
    return getDb()
      .select({ task: TASK_COLUMNS, assignee: ASSIGNEE_COLUMNS })
      .from(tasks)
      .leftJoin(users, eq(users.id, tasks.assigneeId))
      .where(scopedByProject(tasks, projectId))
      .orderBy(asc(tasks.createdAt), asc(tasks.id))
      .all()
      .map((row) => ({ ...row.task, assignee: row.assignee }));
  },

  byId(projectId: number, taskId: number): TaskListItem | undefined {
    return findWithAssignee(projectId, taskId);
  },

  /**
   * Inserts a task together with its creation event (`fromStatus` NULL →
   * initial status) atomically.
   */
  create(projectId: number, input: TaskCreateValues, changedById: number): TaskListItem {
    return getDb().transaction(() => {
      const created: Task = getDb()
        .insert(tasks)
        .values({ ...input, projectId })
        .returning()
        .get();
      getDb()
        .insert(taskStatusEvents)
        .values({
          taskId: created.id,
          projectId,
          fromStatus: null,
          toStatus: created.status,
          changedById,
        })
        .run();
      return requireWithAssignee(projectId, created.id);
    });
  },

  update(projectId: number, taskId: number, patch: TaskUpdatePatch): TaskListItem {
    return getDb().transaction(() => {
      getDb()
        .update(tasks)
        .set(patch)
        .where(scopedByProject(tasks, projectId, eq(tasks.id, taskId)))
        .run();
      return requireWithAssignee(projectId, taskId);
    });
  },

  /**
   * Moves a card to another kanban column and records the transition.
   * A no-op move (same status) touches neither the row nor the audit trail.
   */
  move(projectId: number, taskId: number, status: TaskStatus, changedById: number): TaskListItem {
    return getDb().transaction(() => {
      const current: { status: TaskStatus } | undefined = getDb()
        .select({ status: tasks.status })
        .from(tasks)
        .where(scopedByProject(tasks, projectId, eq(tasks.id, taskId)))
        .get();
      if (!current) throw new ApiError(ErrorCode.NOT_FOUND, "Task not found.");
      if (current.status !== status) {
        getDb()
          .update(tasks)
          .set({ status })
          .where(scopedByProject(tasks, projectId, eq(tasks.id, taskId)))
          .run();
        getDb()
          .insert(taskStatusEvents)
          .values({
            taskId,
            projectId,
            fromStatus: current.status,
            toStatus: status,
            changedById,
          })
          .run();
      }
      return requireWithAssignee(projectId, taskId);
    });
  },

  /** Task rows disappear together with their events (ON DELETE CASCADE). */
  delete(projectId: number, taskId: number): void {
    getDb()
      .delete(tasks)
      .where(scopedByProject(tasks, projectId, eq(tasks.id, taskId)))
      .run();
  },

  /** Status history of one task, oldest transition first. */
  listEvents(projectId: number, taskId: number): TaskEvent[] {
    return getDb()
      .select(EVENT_COLUMNS)
      .from(taskStatusEvents)
      .where(scopedByProject(taskStatusEvents, projectId, eq(taskStatusEvents.taskId, taskId)))
      .orderBy(asc(taskStatusEvents.changedAt), asc(taskStatusEvents.id))
      .all();
  },

  /**
   * Membership check used for assignee validation. This is the `project_members`
   * table — the Tasks module does NOT reach into the Projects service.
   */
  findMember(projectId: number, userId: number) {
    return getDb()
      .select({ userId: projectMembers.userId })
      .from(projectMembers)
      .where(scopedByProject(projectMembers, projectId, eq(projectMembers.userId, userId)))
      .get();
  },
};
