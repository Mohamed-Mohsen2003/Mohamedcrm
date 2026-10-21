import path from "node:path";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

export type Database = PostgresJsDatabase<typeof schema>;

type DbState = { db: Database; ready: Promise<void> };

const globalForDb = globalThis as unknown as { __nexoraDb?: DbState };

const MIGRATIONS_FOLDER = path.join(process.cwd(), "drizzle");

async function createDb(): Promise<{ db: Database; migrate: () => Promise<void> }> {
  const url = process.env.DATABASE_URL;

  if (url) {
    const [{ drizzle }, { default: postgres }, { migrate }] = await Promise.all([
      import("drizzle-orm/postgres-js"),
      import("postgres"),
      import("drizzle-orm/postgres-js/migrator"),
    ]);
    const client = postgres(url, { max: process.env.VERCEL ? 1 : 10, prepare: false });
    const db = drizzle(client, { schema });
    return { db, migrate: () => migrate(db, { migrationsFolder: MIGRATIONS_FOLDER }) };
  }

  // Embedded Postgres (WASM). Persisted on disk locally, in-memory on serverless hosts.
  const [{ PGlite }, { drizzle }, { migrate }] = await Promise.all([
    import("@electric-sql/pglite"),
    import("drizzle-orm/pglite"),
    import("drizzle-orm/pglite/migrator"),
  ]);
  const dataDir = process.env.VERCEL || process.env.NODE_ENV === "test" ? undefined : path.join(process.cwd(), ".data", "pglite");
  if (dataDir) {
    const { mkdirSync } = await import("node:fs");
    mkdirSync(dataDir, { recursive: true });
  }
  const client = dataDir ? new PGlite(dataDir) : new PGlite();
  const db = drizzle(client, { schema }) as unknown as Database;
  return {
    db,
    migrate: () => migrate(db as never, { migrationsFolder: MIGRATIONS_FOLDER }),
  };
}

async function bootstrap(): Promise<DbState> {
  const { db, migrate } = await createDb();
  const ready = (async () => {
    await migrate();
    const shouldSeed = process.env.DEMO_MODE !== "false";
    if (shouldSeed) {
      const { seedIfEmpty } = await import("./seed");
      await seedIfEmpty(db);
    }
  })();
  return { db, ready };
}

let pending: Promise<DbState> | undefined;

/** Returns a migrated (and, in demo mode, seeded) database connection. */
export async function getDb(): Promise<Database> {
  if (!globalForDb.__nexoraDb) {
    pending ??= bootstrap().then((state) => {
      globalForDb.__nexoraDb = state;
      return state;
    });
    const state = await pending;
    await state.ready;
    return state.db;
  }
  await globalForDb.__nexoraDb.ready;
  return globalForDb.__nexoraDb.db;
}

export { schema };
