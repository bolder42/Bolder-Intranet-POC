import type { Role } from '@bolder/shared';
import type { DefaultSession } from 'next-auth';

/**
 * Auth.js type augmentation.
 *
 * The session carries the user's global `Role` (MODULES.md → Roles) and the
 * backend's own HS256 JWT (`apiToken`), which the frontend forwards to the Hono
 * API in the `Authorization` header.
 */
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: Role;
      apiToken: string;
    } & DefaultSession['user'];
  }

  interface User {
    role: Role;
    apiToken: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: Role;
    apiToken: string;
  }
}