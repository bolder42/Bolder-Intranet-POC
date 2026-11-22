import { randomInt } from "node:crypto";

/**
 * 30-char Crockford-style alphabet: no I, L, O, U, 0, 1 → no visual ambiguity
 * when a code is read aloud or retyped from a screenshot.
 */
export const INVITE_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTVWXYZ23456789";
export const INVITE_CODE_LENGTH = 8;

/**
 * Generates a uniformly distributed invite code with `randomInt` from
 * `node:crypto` — never `Math.random`, which is predictable.
 */
export function generateInviteCode(): string {
  let code = "";
  for (let i = 0; i < INVITE_CODE_LENGTH; i += 1) {
    code += INVITE_CODE_ALPHABET[randomInt(INVITE_CODE_ALPHABET.length)];
  }
  return code;
}

/** Canonical form: uppercase, strips spaces/dashes/any non-alphanumeric. */
export function normalizeInviteCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
}
