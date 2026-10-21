/**
 * Applies SQL migrations from ./drizzle to the configured database.
 * Usage: npm run db:migrate
 */
process.env.DEMO_MODE = "false";

const { getDb } = await import("../src/lib/db/index");
await getDb();
console.log("✔ Migrations applied");
process.exit(0);
export {};
