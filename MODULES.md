# Bolder Intranet — Modules

A prototype of a corporate intranet that brings together knowledge organization and project tracking in a single platform.

---

## Projects

Creation and visualization of projects. A generalist view of every project. It must display its participants and final deadline in a concise/brief way, but must also offer the option to open a detailed view of the participants.

When a project is selected, it must show a dashboard with summarized information about that project. The Overview tab is the project landing page. Tasks, Wiki, and Schedule remain within the Project shell and belong to the selected project.

**Only users holding the global `tech_lead` role (or admins) can modify/create projects. Tech Lead is a single global position, not a per-project role.**

Project deletion is available to Admin and Tech Lead. Tech Leads MUST be participants of the project; Admins may delete any project. Deletion permanently removes the project's Tasks, Wiki pages, Schedule items, and memberships.

**Requires WRITE and READ access to the database.**

---

## Wiki per project

A view similar to notion that allows each project to centralize links, documentation, and relevant references.

Always belongs to a project — it is not standalone.

**All participants of a project can modify the wiki.**

**Requires WRITE and READ access to the database.**

---

## Schedule per project

Visualization of deadlines and milestones linked to a project. Can have more than one view (calendar, lists, or just one of them). Needs to show deadlines clearly.

Shows milestones and deadlines.

Always belongs to a project — it is not standalone.

**Only users holding the global `tech_lead` role (or admins) can modify the schedule.**

**Requires WRITE and READ access to the database.**

---

## Home page

Main dashboard that changes according to the user's role.
- Whoever leads the team sees stats on the tasks of users from their projects, tasks stalled for too long, and similar insights.
- Admins see other things available only to them: total projects, invitations, etc.
- Regular users see their current tasks, upcoming objectives, and recent wiki activity (such as new pages).

**Requires READ-ONLY access to the database.**

---

## Database

A single database for the entire project, with fields partitioned by `project_id` to separate data of different projects.

### Authentication and control

Users must be able to log into the platform with an account. There MUST be an access control mechanism that allows an administrator to restrict access to authorized users only.

### Cross-cutting rule

**All modules with database access MUST consult the user's identity before performing any operation.**

---

## Roles

An addition to the Authentication and Control part of the database. User roles MUST be checked whenever users try to perform operations that depend on specific roles.

Roles, in increasing level of access, are: Dev; Tech Lead; Admin.

**Admins have access to all operations, even when not explicitly stated in the module.**

---

## Task view per project

Clear visualization of tasks within the project, progress, and the people responsible for each one. Should work similarly to the kanban that exists on GitHub.

Shows work units (tasks) and status.

Always belongs to a project — it is not standalone.

**All participants of a project can modify the task view.**

**Requires WRITE and READ access to the database.**

---

## Access summary

| Module                  | Database access                              |
|-------------------------|----------------------------------------------|
| Projects                | WRITE and READ                               |
| Wiki per project        | WRITE and READ                               |
| Schedule per project    | WRITE and READ                               |
| Home page               | READ-ONLY                                    |
| Database                | (data layer)                                 |
| Roles                   | (extends database auth/control — no direct DB access) |
| Task view per project   | WRITE and READ                               |

---

## Role-based write summary

| Module                  | Who can write                                |
|-------------------------|----------------------------------------------|
| Projects                | Tech Lead (global) or Admin                   |
| Wiki per project        | Any project participant                      |
| Schedule per project    | Tech Lead (global) or Admin                  |
| Task view per project   | Any project participant                      |
| Any operation           | Admin (always allowed, even if not explicit)  |

---

## Base infrastructure

This file describes **what** each module is. For **how** the modules are wired together — the monorepo layout, the three UI shells, the data-layer boundaries, the role guards, the Hono RPC end-to-end types — see `INFRA.md`.
