import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { deals, pipelineStages } from "@/lib/db/schema";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const db = await getDb();
  const rows = await db
    .select({ id: deals.id, title: deals.title })
    .from(deals)
    .innerJoin(pipelineStages, eq(deals.stageId, pipelineStages.id))
    .where(and(eq(deals.orgId, user.orgId), eq(pipelineStages.kind, "open")))
    .orderBy(desc(deals.updatedAt))
    .limit(300);
  return NextResponse.json(rows, { headers: { "Cache-Control": "private, no-store" } });
}
