import type { Role } from "@bolder/shared";

/** The authenticated user attached to a request / context. */
export type SessionUser = {
  id: number;
  email: string;
  name: string;
  role: Role;
};

/** Minimal authentication context consumed by the role guards. */
export type AuthContext = {
  user: SessionUser;
};
