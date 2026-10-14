"use client";

import { useActionState, useEffect } from "react";
import type { ScheduleItem } from "@bolder/shared";
import { Button, Input } from "@/components/ui";
import { saveScheduleItem } from "@/app/app/projects/[projectId]/schedule/actions";

import { toDateKey } from "./format";
import type { ScheduleSaveState } from "./types";

const INITIAL_STATE: ScheduleSaveState = { ok: false };

export interface ScheduleFormProps {
  projectId: string;
  /** When present the form edits this item instead of creating a new one. */
  item?: ScheduleItem | undefined;
  /** `yyyy-mm-dd` preset used when creating from a calendar day click. */
  defaultDate?: string | undefined;
  onDone?: (() => void) | undefined;
}

export function ScheduleForm({ projectId, item, defaultDate, onDone }: ScheduleFormProps) {
  const [state, action, pending] = useActionState(saveScheduleItem, INITIAL_STATE);

  useEffect(() => {
    if (state.ok) onDone?.();
  }, [state, onDone]);

  const dueDate = item ? toDateKey(item.dueAt) : (defaultDate ?? "");

  return (
    <form action={action} className="schedule-form">
      <input type="hidden" name="projectId" value={projectId} />
      {item ? <input type="hidden" name="itemId" value={item.id} /> : null}

      <Input label="Title" name="title" required maxLength={200} defaultValue={item?.title ?? ""} />

      <div className="schedule-form-field">
        <label htmlFor="schedule-kind">Type</label>
        <select id="schedule-kind" name="kind" defaultValue={item?.kind ?? "milestone"}>
          <option value="milestone">Milestone</option>
          <option value="deadline">Deadline</option>
        </select>
      </div>

      <Input label="Date" name="dueAt" type="date" required defaultValue={dueDate} />

      <div className="schedule-form-field">
        <label htmlFor="schedule-description">Description</label>
        <textarea
          id="schedule-description"
          name="description"
          rows={3}
          defaultValue={item?.description ?? ""}
        />
      </div>

      {state.error ? <p role="alert">{state.error}</p> : null}

      <div className="schedule-form-actions">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : item ? "Save changes" : "Add item"}
        </Button>
        {onDone ? (
          <Button type="button" variant="secondary" disabled={pending} onClick={onDone}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}
