"use client";

import { Button, Input } from "@bolder/ui";
import { signIn } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type InviteReason = "not_found" | "used" | "revoked" | "expired";
type InviteState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "valid"; role: string }
  | { status: "invalid"; reason: InviteReason };

const reasonMessages: Record<InviteReason, string> = {
  not_found: "This invite code does not exist.",
  used: "This invite code has already been used.",
  revoked: "This invite code has been revoked.",
  expired: "This invite code has expired.",
};

function humanizeRole(role: string): string {
  return role
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function RegisterForm() {
  const [inviteCode, setInviteCode] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | undefined>(undefined);
  const [inviteState, setInviteState] = useState<InviteState>({ status: "idle" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const code = inviteCode.trim();

    if (!code) {
      setInviteState({ status: "idle" });
      setInviteError(undefined);
      return;
    }

    setInviteState({ status: "checking" });
    setInviteError(undefined);

    const timeoutId = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch(`${API_URL}/api/invites/validate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
          signal: controller.signal,
        });

        const data = (await response.json()) as
          { valid: true; role: string } | { valid: false; reason: InviteReason };

        if (!response.ok || !data.valid) {
          const reason = "reason" in data ? data.reason : "not_found";
          setInviteState({ status: "invalid", reason });
          setInviteError(reasonMessages[reason]);
          return;
        }

        setInviteState({ status: "valid", role: data.role });
        setInviteError(undefined);
      } catch (error) {
        // Network or abort: keep the form submittable so the server stays the authority.
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setInviteState({ status: "idle" });
        setInviteError(undefined);
      }
    }, 400);

    return () => {
      clearTimeout(timeoutId);
      abortRef.current?.abort();
    };
  }, [inviteCode]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          inviteCode: inviteCode.trim(),
        }),
      });

      if (!response.ok) {
        let message = "Could not create your account. Please try again.";
        try {
          const data = (await response.json()) as { error?: { message?: string } };
          if (data.error?.message) {
            message = data.error.message;
          }
        } catch {
          // Fall back to the default message if the body is not JSON.
        }
        setFormError(message);
        setIsSubmitting(false);
        return;
      }
    } catch {
      setFormError("Could not reach the server. Please try again.");
      setIsSubmitting(false);
      return;
    }

    // Auto sign-in after a successful registration.
    await signIn("credentials", { email, password, redirectTo: "/app" });
  }

  const submitDisabled =
    isSubmitting ||
    inviteState.status === "checking" ||
    inviteState.status === "invalid" ||
    (inviteState.status === "idle" && inviteCode.trim() === "");

  return (
    <form className="auth-form" onSubmit={handleSubmit} aria-label="Create account">
      <div>
        <h2 className="auth-section-title">Create account</h2>
        <p className="auth-section-subtitle">Join the Bolder Intranet.</p>
      </div>

      {formError ? (
        <div className="auth-form-alert" role="alert">
          {formError}
        </div>
      ) : null}

      <Input
        label="Invite code"
        name="inviteCode"
        type="text"
        autoComplete="off"
        placeholder="XXXXXXXX"
        value={inviteCode}
        onChange={(event) => setInviteCode(event.target.value)}
        error={inviteError}
        className="auth-invite-input"
        required
      />
      <InviteStatus state={inviteState} />

      <Input
        label="Name"
        name="name"
        type="text"
        autoComplete="name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        required
      />

      <Input
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        required
      />

      <Input
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        required
      />

      <Button type="submit" className="auth-submit" disabled={submitDisabled}>
        {isSubmitting ? "Creating account..." : "Create account"}
      </Button>

      <p className="auth-alt">
        Already have an account? <a href="/auth/login">Sign in</a>
      </p>
    </form>
  );
}

function InviteStatus({ state }: { state: InviteState }) {
  if (state.status === "idle") {
    return (
      <p className="auth-invite-status auth-invite-status--checking">
        An administrator must provide an invite code.
      </p>
    );
  }

  if (state.status === "checking") {
    return (
      <p className="auth-invite-status auth-invite-status--checking" aria-live="polite">
        Checking code…
      </p>
    );
  }

  if (state.status === "valid") {
    return (
      <p className="auth-invite-status auth-invite-status--valid" aria-live="polite">
        Code accepted · {humanizeRole(state.role)}
      </p>
    );
  }

  // Invalid state is surfaced by the Input's inline error; avoid duplicating it here.
  return null;
}
