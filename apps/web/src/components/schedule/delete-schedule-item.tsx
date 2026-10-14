"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui";
import { deleteScheduleItemAction } from "@/app/app/projects/[projectId]/schedule/actions";

export interface DeleteScheduleItemProps {
  projectId: string;
  itemId: number;
  itemTitle: string;
}

/** Inline delete control for a single schedule entry. */
export function DeleteScheduleItem({ projectId, itemId, itemTitle }: DeleteScheduleItemProps) {
  const [error, action, pending] = useActionState(deleteScheduleItemAction, "");

  return (
    <form action={action} className="schedule-delete">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="itemId" value={itemId} />
      <Button
        type="submit"
        variant="secondary"
        disabled={pending}
        aria-label={`Delete ${itemTitle}`}
      >
        {pending ? "Deleting…" : "Delete"}
      </Button>
      {error ? <span role="alert">{error}</span> : null}
    </form>
  );
}
