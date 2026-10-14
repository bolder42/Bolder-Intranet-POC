"use server";

import { CreateScheduleItemSchema, UpdateScheduleItemSchema } from "@bolder/shared";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { api, getAuthHeaders } from "@/lib/api";
import type { ScheduleSaveState } from "@/components/schedule/types";

/** Schedule writes are restricted to the global Tech Lead and Admin roles. */
function mayWrite(role: string | undefined): boolean {
  return role === "tech_lead" || role === "admin";
}

function schedulePath(projectId: string): string {
  return `/app/projects/${projectId}/schedule`;
}

function readForm(form: FormData) {
  const projectId = String(form.get("projectId") ?? "");
  const itemId = String(form.get("itemId") ?? "");
  const date = String(form.get("dueAt") ?? "");
  return {
    projectId,
    itemId,
    title: String(form.get("title") ?? ""),
    kind: String(form.get("kind") ?? "milestone"),
    dueAt: date ? Date.parse(`${date}T00:00:00Z`) : Number.NaN,
    description: String(form.get("description") ?? "").trim(),
  };
}

export async function saveScheduleItem(
  _previous: ScheduleSaveState,
  form: FormData,
): Promise<ScheduleSaveState> {
  const session = await auth();
  if (!session?.user || !mayWrite(session.user.role)) {
    return { ok: false, error: "You cannot modify the schedule." };
  }

  const { projectId, itemId, title, kind, dueAt, description } = readForm(form);
  if (!/^\d+$/.test(projectId)) return { ok: false, error: "Invalid project." };

  const base = { title, kind, dueAt };

  if (itemId) {
    if (!/^\d+$/.test(itemId)) return { ok: false, error: "Invalid item." };
    const parsed = UpdateScheduleItemSchema.safeParse({
      ...base,
      description: description ? description : null,
    });
    if (!parsed.success) return { ok: false, error: "Check the title, type and date." };

    try {
      const headers = await getAuthHeaders();
      const response = await api.api.schedule[":projectId"][":itemId"].$patch(
        { param: { projectId, itemId }, json: parsed.data },
        { headers },
      );
      if (!response.ok) {
        return {
          ok: false,
          error: "Unable to save the item. Check your permissions and try again.",
        };
      }
    } catch {
      return { ok: false, error: "Unable to reach the API. Please try again." };
    }
  } else {
    const parsed = CreateScheduleItemSchema.safeParse({
      ...base,
      description: description ? description : undefined,
    });
    if (!parsed.success) return { ok: false, error: "Check the title, type and date." };

    try {
      const headers = await getAuthHeaders();
      const response = await api.api.schedule[":projectId"].$post(
        { param: { projectId }, json: parsed.data },
        { headers },
      );
      if (!response.ok) {
        return {
          ok: false,
          error: "Unable to save the item. Check your permissions and try again.",
        };
      }
    } catch {
      return { ok: false, error: "Unable to reach the API. Please try again." };
    }
  }

  revalidatePath(schedulePath(projectId));
  return { ok: true };
}

export async function deleteScheduleItemAction(_previous: string, form: FormData): Promise<string> {
  const session = await auth();
  if (!session?.user || !mayWrite(session.user.role)) return "You cannot modify the schedule.";

  const projectId = String(form.get("projectId") ?? "");
  const itemId = String(form.get("itemId") ?? "");
  if (!/^\d+$/.test(projectId) || !/^\d+$/.test(itemId)) return "Invalid item.";

  try {
    const headers = await getAuthHeaders();
    const response = await api.api.schedule[":projectId"][":itemId"].$delete(
      { param: { projectId, itemId } },
      { headers },
    );
    if (!response.ok) {
      return "Unable to delete the item. Check your permissions and try again.";
    }
  } catch {
    return "Unable to reach the API. Please try again.";
  }

  revalidatePath(schedulePath(projectId));
  return "";
}
