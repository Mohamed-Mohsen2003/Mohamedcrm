import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { listQuerySchema } from "@/lib/validation/schemas";
import { listCompanies, listContacts, listDeals, listLeads } from "@/server/queries/records";
import { toCsv } from "@/lib/utils/format";
import { getDb } from "@/lib/db";
import { recordAudit } from "@/server/audit";

const ENTITIES = ["leads", "contacts", "companies", "deals"] as const;
type Entity = (typeof ENTITIES)[number];

export async function GET(request: NextRequest, { params }: { params: Promise<{ entity: string }> }) {
  const { entity } = await params;
  if (!(ENTITIES as readonly string[]).includes(entity)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (!can(user.role, "records:export")) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  // Same filters as the list view, without pagination (capped for safety).
  const q = listQuerySchema.parse({ ...Object.fromEntries(request.nextUrl.searchParams), page: 1, perPage: 100 });
  const query = { ...q, perPage: 5000 };
  let rows: Array<Record<string, unknown>> = [];

  switch (entity as Entity) {
    case "leads":
      rows = (await listLeads(user.orgId, user.id, query)).rows.map((r) => ({
        first_name: r.firstName, last_name: r.lastName, email: r.email, phone: r.phone, company: r.companyName, job_title: r.jobTitle,
        source: r.source, status: r.status, score: r.score, estimated_value: r.estimatedValue, owner: r.ownerName, created_at: r.createdAt,
      }));
      break;
    case "contacts":
      rows = (await listContacts(user.orgId, user.id, query)).rows.map((r) => ({
        first_name: r.firstName, last_name: r.lastName, email: r.email, phone: r.phone, job_title: r.jobTitle, company: r.companyName,
        lifecycle: r.lifecycle, tags: r.tags, owner: r.ownerName, created_at: r.createdAt,
      }));
      break;
    case "companies":
      rows = (await listCompanies(user.orgId, user.id, query)).rows.map((r) => ({
        name: r.name, domain: r.domain, industry: r.industry, size: r.size, country: r.country, city: r.city,
        contacts: r.contactCount, open_pipeline: r.openValue, won_revenue: r.wonValue, owner: r.ownerName, created_at: r.createdAt,
      }));
      break;
    case "deals":
      rows = (await listDeals(user.orgId, user.id, query)).rows.map((r) => ({
        title: r.title, value: r.value, stage: r.stageName, probability: r.stageProbability, priority: r.priority, company: r.companyName,
        contact: r.contactFirstName ? `${r.contactFirstName} ${r.contactLastName}` : "", expected_close: r.expectedCloseDate,
        closed_at: r.closedAt, lost_reason: r.lostReason, owner: r.ownerName, created_at: r.createdAt,
      }));
      break;
  }

  await recordAudit(await getDb(), {
    orgId: user.orgId,
    actorId: user.id,
    action: `${entity.slice(0, -1).replace("companie", "company")}.exported`,
    entityType: entity === "companies" ? "company" : (entity.slice(0, -1) as "lead" | "contact" | "deal"),
    entityLabel: `${rows.length} ${entity}`,
  });

  const stamp = new Date().toISOString().slice(0, 10);
  // BOM so Excel opens UTF-8 (Arabic names) correctly.
  return new NextResponse(`﻿${toCsv(rows)}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="nexora-${entity}-${stamp}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
