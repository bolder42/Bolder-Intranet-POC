import Link from "next/link";
import type { HomePerformance } from "@bolder/shared";

const STATUS = {
  not_started: "Not started",
  in_progress: "In progress",
  at_risk: "At risk",
  completed: "Completed",
};

export function ProjectPerformance({
  data,
  global,
}: {
  data: HomePerformance | null;
  global: boolean;
}) {
  return (
    <section className="leadership-panel" aria-labelledby="performance-title">
      <h2 id="performance-title" className="widget-title">
        Project performance
      </h2>
      <p className="dashboard-meta">
        {global ? "All projects" : "Projects you participate in"} · Progress is the percentage of
        tasks currently done. At risk means overdue tasks or a passed project deadline.
      </p>
      {!data ? (
        <p role="alert">Unable to load project performance. Reload the page to try again.</p>
      ) : data.projects.length === 0 ? (
        <p>No projects to report yet.</p>
      ) : (
        <div className="performance-grid">
          {data.projects.map((project) => (
            <article key={project.id} className="performance-card">
              <div className="leadership-heading">
                <h3>
                  <Link href={`/app/projects/${project.id}`}>{project.name}</Link>
                </h3>
                <span className={`performance-status status-${project.status}`}>
                  {STATUS[project.status]}
                </span>
              </div>
              <p className="dashboard-meta">
                Deadline:{" "}
                {project.deadline === null
                  ? "Not set"
                  : new Date(project.deadline).toLocaleDateString("en", { timeZone: "UTC" })}
              </p>
              <label className="performance-progress">
                {project.progress}% complete · {project.done}/{project.total} tasks
                <progress
                  max="100"
                  value={project.progress}
                  aria-label={`${project.name} completion`}
                />
              </label>
              <div className="performance-counts">
                <span>
                  <strong>{project.doing}</strong> in progress
                </span>
                <span>
                  <strong>{project.overdue}</strong> overdue
                </span>
                <span>
                  <strong>{project.unassigned}</strong> unassigned open tasks
                </span>
              </div>
              <details>
                <summary>Team workload · {project.members.length} participants</summary>
                <div className="leadership-table-scroll">
                  <table className="leadership-table">
                    <caption className="sr-only">{project.name} team workload</caption>
                    <thead>
                      <tr>
                        <th>Participant</th>
                        <th>Assigned</th>
                        <th>Done</th>
                        <th>Overdue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {project.members.map((member) => (
                        <tr key={member.id}>
                          <td>{member.name}</td>
                          <td>{member.assigned}</td>
                          <td>{member.done}</td>
                          <td>{member.overdue}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
