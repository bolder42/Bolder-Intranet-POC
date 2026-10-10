import { eq } from "drizzle-orm";
import {
  getDb,
  projectMembers,
  projects,
  users,
  scopedByProject,
  type NewProject,
} from "@bolder/db";

/**
 * Data-access for `projects` and `project_members`.
 *
 * Projects are the aggregate root, so they are NOT partitioned by
 * `project_id` themselves — `scopedByProject` does not apply here.
 */
export const projectsRepo = {
  candidates() {
    return getDb()
      .select({ id: users.id, name: users.name, email: users.email, role: users.role })
      .from(users)
      .all();
  },
  createWithMembers(input: NewProject, memberIds: number[]) {
    return getDb().transaction(() => {
      const project = getDb().insert(projects).values(input).returning().get();
      for (const userId of memberIds)
        getDb().insert(projectMembers).values({ projectId: project.id, userId }).run();
      return project;
    });
  },
  listAll() {
    return getDb().select().from(projects).all();
  },

  listForUser(userId: number) {
    return getDb()
      .select({ project: projects })
      .from(projects)
      .innerJoin(projectMembers, eq(projectMembers.projectId, projects.id))
      .where(eq(projectMembers.userId, userId))
      .all()
      .map((row) => row.project);
  },

  byId(id: number) {
    return getDb().select().from(projects).where(eq(projects.id, id)).get();
  },

  create(input: NewProject) {
    return getDb().insert(projects).values(input).returning().get();
  },

  update(id: number, input: Partial<NewProject>) {
    return getDb().update(projects).set(input).where(eq(projects.id, id)).returning().get();
  },

  delete(id: number) {
    return getDb().delete(projects).where(eq(projects.id, id)).run();
  },

  listMembers(projectId: number) {
    return getDb()
      .select({
        id: projectMembers.id,
        projectId: projectMembers.projectId,
        userId: projectMembers.userId,
        joinedAt: projectMembers.joinedAt,
        user: { id: users.id, name: users.name, email: users.email, role: users.role },
      })
      .from(projectMembers)
      .innerJoin(users, eq(users.id, projectMembers.userId))
      .where(scopedByProject(projectMembers, projectId))
      .all();
  },

  findMembership(projectId: number, userId: number) {
    return getDb()
      .select()
      .from(projectMembers)
      .where(scopedByProject(projectMembers, projectId, eq(projectMembers.userId, userId)))
      .get();
  },

  addMember(input: { projectId: number; userId: number }) {
    return getDb().insert(projectMembers).values(input).returning().get();
  },

  removeMember(projectId: number, userId: number) {
    return getDb()
      .delete(projectMembers)
      .where(scopedByProject(projectMembers, projectId, eq(projectMembers.userId, userId)))
      .run();
  },
};
