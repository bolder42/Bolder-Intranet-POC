"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui";
import { deleteScheduleItemAction } from "@/app/app/projects/[projectId]/schedule/actions";

export interface DeleteScheduleItemProps {
  projectId: string;
  itemId: number;
  itemTitle: string;
}

/** Inline delete control: asks for confirmation before submitting the action. */
export function DeleteScheduleItem({ projectId, itemId, itemTitle }: DeleteScheduleItemProps) {
  const [confirming, setConfirming] = useState(false);
  const [error, action, pending] = useActionState(deleteScheduleItemAction, "");

  if (!confirming) {
    return (
      <Button type="button" variant="secondary" onClick={() => setConfirming(true)}>
        Delete
      </Button>
    );
  }

  return (
    <form action={action} className="schedule-delete">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="itemId" value={itemId} />
      <span className="schedule-delete-question">Delete “{itemTitle}”?</span>
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Deleting…" : "Confirm"}
      </Button>
      <Button
        type="button"
        variant="secondary"
        disabled={pending}
        onClick={() => setConfirming(false)}
      >
        Cancel
      </Button>
      {error ? <span role="alert">{error}</span> : null}
    </form>
  );
}
