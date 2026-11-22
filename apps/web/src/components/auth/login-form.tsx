"use client";

import { Button, Input } from "@bolder/ui";
import { signIn } from "next-auth/react";
import { useState } from "react";
import type { FormEvent } from "react";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldError(undefined);
    setIsSubmitting(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      redirectTo: "/app",
    });

    setIsSubmitting(false);

    if (!result || result.error) {
      const message = "Invalid email or password.";
      setFormError(message);
      setFieldError(message);
      return;
    }

    window.location.assign(result.url ?? "/app");
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit} aria-label="Sign in">
      <div className="auth-form-heading">
        <h2 className="auth-section-title">Sign in</h2>
        <p className="auth-section-subtitle">Welcome back to the Bolder Intranet.</p>
      </div>

      {formError ? (
        <div className="auth-form-alert" role="alert">
          {formError}
        </div>
      ) : null}

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
        autoComplete="current-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        error={fieldError}
        required
      />

      <Button type="submit" className="auth-submit" disabled={isSubmitting}>
        {isSubmitting ? "Signing in..." : "Sign in"}
      </Button>

      <p className="auth-alt">
        No account? <a href="/auth/register">Create one</a>
      </p>
    </form>
  );
}
