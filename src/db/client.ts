import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import * as schema from "./schema";

// Fail fast with a clear message instead of libsql's own cryptic
// "URL_INVALID: The URL '' is not in a valid format" a few frames deeper --
// that's exactly what an unset TURSO_DATABASE_URL produced in CI before this
// guard existed (see git history/ARCHITECTURE.md's CI section).
function requireEnv(name: "TURSO_DATABASE_URL" | "TURSO_AUTH_TOKEN"): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable ${name}. Set it in .env (see .env.example).`);
  }
  return value;
}

const client = createClient({
  url: requireEnv("TURSO_DATABASE_URL"),
  authToken: requireEnv("TURSO_AUTH_TOKEN"),
});

export const db = drizzle(client, { schema });
