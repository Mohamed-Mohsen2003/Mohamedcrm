/**
 * Seeds the database with the deterministic demo dataset.
 *   npm run db:seed    — seeds only if the database is empty
 *   npm run db:reset   — wipes all CRM data and re-seeds
 */
process.env.DEMO_MODE = "false";

const { getDb } = await import("../src/lib/db/index");
const { seedIfEmpty, resetDatabase } = await import("../src/lib/db/seed");

const db = await getDb();
const started = Date.now();

if (process.argv.includes("--reset")) {
  await resetDatabase(db);
  console.log(`✔ Database reset and seeded in ${Date.now() - started}ms`);
} else {
  const seeded = await seedIfEmpty(db);
  console.log(seeded ? `✔ Seeded in ${Date.now() - started}ms` : "• Database already has data — skipped (use db:reset)");
}
process.exit(0);
export {};
