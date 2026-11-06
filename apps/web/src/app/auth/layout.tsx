import type { ReactNode } from "react";

import { ThemeToggle } from "@/components/shell/theme-toggle";

// The App shell imports this from its own layout; the Auth shell must do the
// same or the `Button`/`Input` primitives render as unstyled browser defaults.
// Imported before auth.css so the auth-scoped overrides win.
import "@bolder/ui/styles.css";
import "./auth.css";

/**
 * AUTH SHELL (one of the three locked UI shells).
 *
 * Full-bleed document layout that mirrors the app dashboard: a centered
 * content column with the brand mark top-left, the auth form below it, and
 * a subtle footer at the bottom.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-shell">
      <div className="auth-shell-inner">
        <div className="auth-theme-toggle">
          <ThemeToggle />
        </div>

        <header className="auth-header">
          <div className="auth-brand" aria-hidden="true">
            B
          </div>
          <div className="auth-header-meta">
            <h1 className="auth-title">Bolder Intranet</h1>
            <p className="auth-subtitle">Your company knowledge and projects, in one place.</p>
          </div>
        </header>

        <main>{children}</main>

        <footer className="auth-footer">
          <p>Bolder Intranet · {new Date().getFullYear()}</p>
        </footer>
      </div>
    </div>
  );
}
