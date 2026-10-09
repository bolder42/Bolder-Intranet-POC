import { hc } from 'hono/client';

import { auth } from '@/auth';

// TYPE-ONLY cross-package import. `AppType` is the Hono RPC route type exposed
// by the backend (see `apps/api/src/app.ts`). Because it is imported with
// `import type`, it is erased at build time: there is NO runtime coupling
// between the frontend and `apps/api`. At runtime we only talk to the API
// over HTTP.
import type { AppType } from '../../../api/src/app';

const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

// The typed RPC path already contains /api through the server's basePath.
// Only the untyped apiFetch helper needs an explicit /api prefix.
const API_BASE = `${API_ORIGIN}/api`;

/**
 * Typed Hono RPC client. Base URL is the origin; route properties supply /api.
 * Every call site gets full type inference end-to-end.
 */
export const api = hc<AppType>(API_ORIGIN, {
  init: {
    credentials: 'include',
  },
});

/**
 * Build the `Authorization` header from the current Auth.js session. The token
 * is the backend's own JWT, captured at sign-in time (see `auth.ts`).
 *
 * MODULES.md: "All modules with database access MUST consult the user's
 * identity before performing any operation."
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const session = await auth();
  const token = (session?.user as { apiToken?: string } | undefined)?.apiToken;
  return token ? { authorization: `Bearer ${token}` } : {};
}

/**
 * Server-side fetch helper for endpoints not (yet) covered by the typed RPC
 * client. `path` is relative to the backend's `/api` prefix, e.g. `/home/summary`.
 */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const authHeaders = await getAuthHeaders();
  for (const [key, value] of Object.entries(authHeaders)) {
    headers.set(key, value);
  }

  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  });
}
