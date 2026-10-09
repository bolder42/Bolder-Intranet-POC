"use client";

import { useActionState, useState } from "react";
import { Button } from "@bolder/ui";
import { deleteProjectAction } from "@/app/app/projects/actions";

export function DeleteProject({
  projectId,
  projectName,
}: {
  projectId: number;
  projectName: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, action, pending] = useActionState(deleteProjectAction, "");
  return (
    <section aria-label="Delete project" style={{ marginTop: "2rem" }}>
      {!confirming ? (
        <Button type="button" onClick={() => setConfirming(true)}>
          Delete project
        </Button>
      ) : (
        <form action={action}>
          <input type="hidden" name="projectId" value={projectId} />
          <p>
            Delete “{projectName}”? Its tasks, wiki pages, schedule and memberships will also be
            permanently deleted.
          </p>
          <Button type="submit" disabled={pending}>
            {pending ? "Deleting…" : "Confirm deletion"}
          </Button>{" "}
          <Button type="button" disabled={pending} onClick={() => setConfirming(false)}>
            Cancel
          </Button>
          {error ? <p role="alert">{error}</p> : null}
        </form>
      )}
    </section>
  );
}
