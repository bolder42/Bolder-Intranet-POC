"use client";

import { useState } from "react";
import type { ScheduleItem } from "@bolder/shared";
import { Button } from "@/components/ui";

import { ScheduleCalendar } from "./schedule-calendar";
import { ScheduleForm } from "./schedule-form";
import { ScheduleList } from "./schedule-list";

export interface ScheduleViewProps {
  projectId: string;
  items: ScheduleItem[];
  /** `yyyy-mm-dd` UTC key for "today", supplied by the server. */
  today: string;
  canWrite: boolean;
}

/**
 * Client orchestrator for the Schedule module: owns the create/edit mode and
 * composes the calendar, list and form. The server component only passes data.
 */
export function ScheduleView({ projectId, items, today, canWrite }: ScheduleViewProps) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ScheduleItem | null>(null);
  const [defaultDate, setDefaultDate] = useState<string | undefined>(undefined);

  function closeForm() {
    setCreating(false);
    setEditing(null);
    setDefaultDate(undefined);
  }

  function startCreate(date?: string) {
    setEditing(null);
    setDefaultDate(date);
    setCreating(true);
  }

  function startEdit(item: ScheduleItem) {
    setCreating(false);
    setDefaultDate(undefined);
    setEditing(item);
  }

  const formOpen = canWrite && (creating || editing !== null);

  return (
    <div className="schedule">
      {canWrite ? (
        <div className="schedule-toolbar">
          <Button type="button" onClick={() => startCreate()}>
            New item
          </Button>
        </div>
      ) : null}

      {formOpen ? (
        <ScheduleForm
          key={editing ? `edit-${editing.id}` : `create-${defaultDate ?? "new"}`}
          projectId={projectId}
          item={editing ?? undefined}
          defaultDate={defaultDate}
          onDone={closeForm}
        />
      ) : null}

      <ScheduleCalendar
        items={items}
        today={today}
        canCreate={canWrite}
        onSelectDay={(dateKey) => startCreate(dateKey)}
      />

      <ScheduleList
        projectId={projectId}
        items={items}
        today={today}
        canWrite={canWrite}
        onEdit={startEdit}
      />
    </div>
  );
}
