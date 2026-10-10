"use client";
import { useActionState } from "react";
import { Button, Input } from "@bolder/ui";
import type { Project, UserPublic } from "@bolder/shared";
import { saveProject } from "@/app/app/projects/actions";
export function ProjectForm({
  project,
  candidates = [],
}: {
  project?: Project;
  candidates?: UserPublic[];
}) {
  const [error, action, pending] = useActionState(saveProject, "");
  return (
    <form action={action} className="project-form">
      {project ? <input type="hidden" name="projectId" value={project.id} /> : null}
      <Input
        label="Project name"
        name="name"
        required
        defaultValue={project?.name ?? ""}
        maxLength={200}
      />
      <label>
        Description
        <textarea name="description" defaultValue={project?.description ?? ""} rows={3} />
      </label>
      <Input
        label="Final deadline"
        name="deadline"
        type="date"
        defaultValue={
          project?.deadline ? new Date(project.deadline).toISOString().slice(0, 10) : ""
        }
      />
      {!project && candidates.length ? (
        <fieldset>
          <legend>Participants (you are included automatically)</legend>
          {candidates.map((user) => (
            <label key={user.id} className="participant-option">
              <input type="checkbox" name="memberIds" value={user.id} />
              {user.name} — {user.role}
            </label>
          ))}
        </fieldset>
      ) : null}
      {error ? <p role="alert">{error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : project ? "Save changes" : "Create project"}
      </Button>
    </form>
  );
}
