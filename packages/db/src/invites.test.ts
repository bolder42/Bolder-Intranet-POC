import Database from "better-sqlite3";
import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Applies every generated migration in order to a fresh in-memory database, so
 * schema drift between `src/schema/*.ts` and `drizzle/*.sql` fails loudly here
 * instead of at runtime.
 */
const DRIZZLE_DIR = new URL("../drizzle/", import.meta.url);

function applyMigrations() {
  const sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");

  const files = readdirSync(DRIZZLE_DIR)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const sql = readFileSync(new URL(file, DRIZZLE_DIR), "utf8");
    for (const statement of sql.split("--> statement-breakpoint")) {
      if (statement.trim().length > 0) sqlite.exec(statement);
    }
  }

  return sqlite;
}

function columns(sqlite: Database.Database, table: string) {
  return sqlite
    .prepare(`PRAGMA table_info(${table})`)
    .all()
    .map(
      (row) => row as { name: string; type: string; notnull: number; dflt_value: string | null },
    );
}

describe("invites migration", () => {
  it("creates the invites table with the expected columns", () => {
    const sqlite = applyMigrations();
    try {
      const byName = new Map(columns(sqlite, "invites").map((c) => [c.name, c]));

      expect([...byName.keys()]).toEqual([
        "id",
        "code",
        "role",
        "created_by",
        "created_at",
        "expires_at",
        "revoked_at",
        "used_at",
        "used_by",
      ]);

      expect(byName.get("code")?.notnull).toBe(1);
      expect(byName.get("created_by")?.notnull).toBe(1);
      expect(byName.get("expires_at")?.notnull).toBe(1);
      expect(byName.get("role")?.dflt_value).toBe("'dev'");
      expect(byName.get("created_at")?.dflt_value).toBe("unixepoch() * 1000");
      for (const nullable of ["revoked_at", "used_at", "used_by"]) {
        expect(byName.get(nullable)?.notnull).toBe(0);
      }
    } finally {
      sqlite.close();
    }
  });

  it("enforces the unique code and defaults role/created_at", () => {
    const sqlite = applyMigrations();
    try {
      sqlite
        .prepare("INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)")
        .run("admin@bolder.local", "hash", "Admin");
      const insert = sqlite.prepare(
        "INSERT INTO invites (code, created_by, expires_at) VALUES (?, 1, ?)",
      );

      insert.run("code-1", 1);
      const row = sqlite
        .prepare("SELECT role, created_at, revoked_at, used_at, used_by FROM invites")
        .get() as {
        role: string;
        created_at: number;
        revoked_at: number | null;
        used_at: number | null;
        used_by: number | null;
      };

      expect(row.role).toBe("dev");
      expect(row.created_at).toBeGreaterThan(0);
      expect(row.revoked_at).toBeNull();
      expect(row.used_at).toBeNull();
      expect(row.used_by).toBeNull();

      expect(() => insert.run("code-1", 1)).toThrow(/UNIQUE/);
    } finally {
      sqlite.close();
    }
  });

  it("sets used_by to null and cascades created_by deletes", () => {
    const sqlite = applyMigrations();
    try {
      sqlite
        .prepare("INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)")
        .run("admin@bolder.local", "hash", "Admin");
      sqlite
        .prepare("INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)")
        .run("dev@bolder.local", "hash", "Dev");
      sqlite
        .prepare(
          "INSERT INTO invites (code, created_by, expires_at, used_at, used_by) VALUES (?, 1, ?, 1, 2)",
        )
        .run("used-by-dev", 1);
      sqlite
        .prepare("INSERT INTO invites (code, created_by, expires_at) VALUES (?, 2, ?)")
        .run("created-by-dev", 1);

      // Deleting the redeemer must keep the invite but clear used_by.
      sqlite.prepare("DELETE FROM users WHERE id = 2").run();
      expect(sqlite.prepare("SELECT code, used_by FROM invites").all()).toEqual([
        { code: "used-by-dev", used_by: null },
      ]);

      // Deleting the creator cascades the invite away.
      sqlite.prepare("DELETE FROM users WHERE id = 1").run();
      expect(sqlite.prepare("SELECT COUNT(*) AS n FROM invites").get()).toEqual({ n: 0 });
    } finally {
      sqlite.close();
    }
  });
});
