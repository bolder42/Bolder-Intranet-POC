import type { ErrorHandler } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { ZodError } from "zod";
import { ApiError } from "@bolder/shared";

/**
 * Maps thrown errors to the API's JSON error envelope:
 *   { error: { code, message } }
 *
 * - `ApiError` → its own code + status
 * - `ZodError` → 422 VALIDATION
 * - anything else → 500 INTERNAL
 */
export const errorHandler: ErrorHandler = (err, c) => {
  if (err instanceof ApiError) {
    return c.json(
      { error: { code: err.code, message: err.message } },
      err.status as ContentfulStatusCode,
    );
  }

  if (err instanceof ZodError) {
    return c.json(
      {
        error: {
          code: "VALIDATION",
          message: "Invalid request payload",
          issues: err.issues,
        },
      },
      422,
    );
  }

  console.error("[api] unhandled error", err);
  return c.json(
    { error: { code: "INTERNAL", message: "Internal server error" } },
    500,
  );
};

/**
 * `@hono/zod-validator` hook: re-throws the ZodError so the shared
 * `errorHandler` produces the 422 envelope instead of zValidator's default.
 */
export function zodErrorHook(result: {
  success: boolean;
  error?: unknown;
}): void {
  if (!result.success) throw result.error;
}
