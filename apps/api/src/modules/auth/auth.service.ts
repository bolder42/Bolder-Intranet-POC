import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { z } from "zod";
import {
  ApiError,
  ErrorCode,
  RoleSchema,
  type RegisterInput,
  type Role,
} from "@bolder/shared";
import { env } from "../../env.js";
import { usersRepo } from "./auth.repo.js";

const SCRYPT_KEYLEN = 64;

/**
 * Hashes a password with Node's built-in scrypt (no native dependency).
 * Format: `scrypt$<salt-hex>$<hash-hex>`.
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, SCRYPT_KEYLEN).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

/** Constant-time verification of a password against a stored hash. */
export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;

  const derived = scryptSync(password, salt, SCRYPT_KEYLEN);
  const expected = Buffer.from(hash, "hex");
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

const TokenPayloadSchema = z.object({
  sub: z.number(),
  role: RoleSchema,
});
export type TokenPayload = z.infer<typeof TokenPayloadSchema>;

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

/** Signs a HS256 JWT with payload `{ sub, role }`. */
export function signToken(user: { id: number; role: Role }): string {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64url(
    JSON.stringify({ sub: user.id, role: user.role }),
  );
  const data = `${header}.${payload}`;
  const signature = createHmac("sha256", env.JWT_SECRET)
    .update(data)
    .digest("base64url");
  return `${data}.${signature}`;
}

/** Verifies a HS256 JWT and returns its payload. Throws 401 on any failure. */
export function verifyToken(token: string): TokenPayload {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new ApiError(ErrorCode.UNAUTHORIZED, "Malformed token.");
  }
  const [header, payload, signature] = parts as [string, string, string];

  const expected = createHmac("sha256", env.JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest("base64url");

  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    throw new ApiError(ErrorCode.UNAUTHORIZED, "Invalid token signature.");
  }

  let decoded: unknown;
  try {
    decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    throw new ApiError(ErrorCode.UNAUTHORIZED, "Malformed token payload.");
  }

  const parsed = TokenPayloadSchema.safeParse(decoded);
  if (!parsed.success) {
    throw new ApiError(ErrorCode.UNAUTHORIZED, "Invalid token payload.");
  }
  return parsed.data;
}

/** Registers a new user. Throws CONFLICT if the email is already taken. */
export function register(input: RegisterInput) {
  if (usersRepo.findByEmail(input.email)) {
    throw new ApiError(ErrorCode.CONFLICT, "Email already registered.");
  }
  return usersRepo.create({
    email: input.email,
    name: input.name,
    role: input.role,
    passwordHash: hashPassword(input.password),
  });
}

/** Verifies credentials and returns the user, or throws UNAUTHORIZED. */
export function verify(email: string, password: string) {
  const user = usersRepo.findByEmail(email);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    throw new ApiError(ErrorCode.UNAUTHORIZED, "Invalid email or password.");
  }
  return user;
}
