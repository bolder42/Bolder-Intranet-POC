import type { Metadata } from "next";
import { redirect } from "next/navigation";

import type { UserProfile } from "@bolder/shared";

import { SettingsForm } from "@/components/settings/settings-form";
import { getProfileAction } from "@/components/settings/settings-actions";
import { auth } from "@/auth";

export const metadata: Metadata = {
  title: "Settings",
};

/**
 * User settings (profile + preferences). Lives inside the app shell, so the
 * sidebar's workspace card — which links here — is always visible.
 */
export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/login");
  }

  // Fresh profile from the API; fall back to the session when it is briefly
  // unavailable so the page still renders.
  const profile = await getProfileAction();
  const initial: UserProfile = profile ?? {
    id: Number(session.user.id ?? 0),
    email: session.user.email ?? "",
    name: session.user.name ?? "",
    role: session.user.role ?? "dev",
    image: null,
  };

  return (
    <div className="settings-page">
      <header className="settings-header">
        <h1 className="settings-title">Settings</h1>
        <p className="settings-subtitle">Your profile and preferences.</p>
      </header>
      <SettingsForm initial={initial} />
    </div>
  );
}
