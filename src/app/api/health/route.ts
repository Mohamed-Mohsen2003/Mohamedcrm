import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const started = Date.now();
  try {
    const db = await getDb();
    await db.execute(sql`select 1`);
    return NextResponse.json({ status: "ok", db: process.env.DATABASE_URL ? "postgres" : "pglite", latencyMs: Date.now() - started });
  } catch {
    return NextResponse.json({ status: "error" }, { status: 503 });
  }
}
