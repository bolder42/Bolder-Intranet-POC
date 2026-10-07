import { serve } from "@hono/node-server";
import { app } from "./app.js";
import { env } from "./env.js";

const server = serve(
  { fetch: app.fetch, port: env.API_PORT },
  (info) => {
    console.warn(
      `[api] Bolder Intranet API listening on http://localhost:${info.port}/api`,
    );
  },
);

function shutdown(signal: string): void {
  console.warn(`[api] received ${signal}, shutting down...`);
  server.close(() => process.exit(0));
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
