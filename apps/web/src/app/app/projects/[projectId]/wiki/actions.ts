"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/api";

function path(projectId: string, pageId?: number) {
  return `/wiki/${projectId}${pageId === undefined ? "" : `/${pageId}`}`;
}

async function send(projectId: string, pageId: number | undefined, method: string, body?: unknown) {
  const response = await apiFetch(path(projectId, pageId), {
    method,
    ...(body === undefined
      ? {}
      : { headers: { "content-type": "application/json" }, body: JSON.stringify(body) }),
  });
  if (!response.ok) {
    const result = (await response.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    throw new Error(result?.error?.message ?? "Unable to save wiki page.");
  }
  revalidatePath(`/app/projects/${projectId}/wiki`);
  return response.json();
}

export async function createWikiPage(projectId: string, input: { title: string; content: string }) {
  return send(projectId, undefined, "POST", input);
}

export async function updateWikiPage(
  projectId: string,
  pageId: number,
  input: { title: string; content: string },
) {
  return send(projectId, pageId, "PATCH", input);
}

export async function removeWikiPage(projectId: string, pageId: number) {
  return send(projectId, pageId, "DELETE");
}
