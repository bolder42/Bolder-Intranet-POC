"use server";

import { CreateInviteSchema, InviteListSchema, InviteSchema, type Invite } from "@bolder/shared";
import { auth } from "@/auth";
import { api, getAuthHeaders } from "@/lib/api";

type InviteResult = { invites?: Invite[]; invite?: Invite; error?: string };

/** Writes belong to Invitations, independently of the read-only Home projection. */
export async function manageInvites(
  operation: "list" | "create" | "revoke",
  input?: { role?: string; expiresInDays?: number; id?: number },
): Promise<InviteResult> {
  const session = await auth();
  if (session?.user?.role !== "admin") return { error: "Only admins can manage invitations." };
  try {
    const headers = await getAuthHeaders();
    if (operation === "list") {
      const response = await api.api.invites.$get({}, { headers, init: { cache: "no-store" } });
      if (!response.ok) return { error: "Unable to load invitations. Please try again." };
      return InviteListSchema.parse(await response.json());
    }
    if (operation === "create") {
      const parsed = CreateInviteSchema.safeParse(input);
      if (!parsed.success) return { error: "Choose a role and an expiry between 1 and 365 days." };
      const response = await api.api.invites.$post({ json: parsed.data }, { headers });
      if (!response.ok) return { error: "Unable to generate an invitation. Please try again." };
      const result = await response.json();
      return { invite: InviteSchema.parse(result.invite) };
    }
    if (operation !== "revoke" || !Number.isSafeInteger(input?.id) || (input?.id ?? 0) <= 0)
      return { error: "Invalid invitation." };
    const response = await api.api.invites[":id"].revoke.$post(
      { param: { id: String(input?.id) } },
      { headers },
    );
    if (!response.ok)
      return { error: "Unable to revoke this invitation. It may already have been used." };
    const result = await response.json();
    return { invite: InviteSchema.parse(result.invite) };
  } catch {
    return { error: "Unable to reach the API. Please try again." };
  }
}
