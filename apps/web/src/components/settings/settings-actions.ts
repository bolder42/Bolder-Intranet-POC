"use server";

import { revalidatePath } from "next/cache";
import type { UpdateMeInput, UserProfile } from "@bolder/shared";

import { api, getAuthHeaders } from "@/lib/api";

/**
 * Server actions for the settings page.
 *
 * Same boundary rule as the Tasks board: the client never calls the API
 * directly — the Bearer JWT lives in the encrypted Auth.js session cookie,
 * readable only on the server (see `getAuthHeaders` in `@/lib/api`).
 */

/** Current user's profile, or null when it cannot be loaded (caller falls back to the session). */
export async function getProfileAction(): Promise<UserProfile | null> {
  try {
    const headers = await getAuthHeaders();
    // Two-argument form is mandatory for param-less routes: a single
    // `{ headers }` argument is treated as route args and the headers are
    // silently dropped (the request then arrives 401 and the caller falls
    // back to a photo-less session profile).
    const response = await api.api.users.me.$get({}, { headers });
    if (!response.ok) return null;
    const data = (await response.json()) as { user: UserProfile };
    return data.user;
  } catch {
    return null;
  }
}

/** Persists display name / photo URL. Throws with a readable message on failure. */
export async function updateProfileAction(payload: UpdateMeInput): Promise<UserProfile> {
  const headers = await getAuthHeaders();
  const response = await api.api.users.me.$patch({ json: payload }, { headers });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { error?: { message?: string } }
      | null;
    throw new Error(body?.error?.message ?? "Could not save your settings. Please try again.");
  }
  const data = (await response.json()) as { user: UserProfile };

  // Refresh this page's data and the root layout so the sidebar shows the
  // new name/photo without signing out and back in.
  revalidatePath("/app/settings");
  revalidatePath("/", "layout");
  return data.user;
}
