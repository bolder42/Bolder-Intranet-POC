import type { ReactNode } from 'react';

import './auth.css';

/**
 * AUTH SHELL (one of the three locked UI shells).
 * Centered, full-viewport card used by /auth/login and /auth/register.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-shell">
      <div className="auth-card">{children}</div>
    </div>
  );
}