import { beforeAll, describe, expect, it } from "vitest";
import { and, eq, isNotNull, isNull, sql } from "drizzle-orm";
import type { Database } from "@/lib/db";
import { deals, leads, pipelineStages, users } from "@/lib/db/schema";
import { DEMO_ACCOUNTS } from "@/lib/db/seed";

// Integration tests against an in-memory PGlite database (migrations + demo seed).
let db: Database;
let orgId: string;
let adminId: string;

beforeAll(async () => {
  process.env.DEMO_MODE = "true";
  const mod = await import("@/lib/db");
  db = await mod.getDb();
  const [admin] = await db.select().from(users).where(eq(users.email, "admin@nexora.demo"));
  orgId = admin!.orgId;
  adminId = admin!.id;
});

describe("demo seed", () => {
  it("creates every demo account with its role", async () => {
    for (const account of DEMO_ACCOUNTS) {
      const [user] = await db.select().from(users).where(eq(users.email, account.email));
      expect(user?.role).toBe(account.role);
    }
  });

  it("keeps closedAt consistent with the stage kind", async () => {
    const [openClosed] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(deals)
      .innerJoin(pipelineStages, eq(deals.stageId, pipelineStages.id))
      .where(and(eq(pipelineStages.kind, "open"), isNotNull(deals.closedAt)));
    const [closedOpen] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(deals)
      .innerJoin(pipelineStages, eq(deals.stageId, pipelineStages.id))
      .where(and(sql`${pipelineStages.kind} <> 'open'`, isNull(deals.closedAt)));
    expect(openClosed!.n).toBe(0);
    expect(closedOpen!.n).toBe(0);
  });

  it("packs board positions 0..n-1 in every stage", async () => {
    const stages = await db.select().from(pipelineStages);
    for (const stage of stages) {
      const rows = await db.select({ position: deals.position }).from(deals).where(eq(deals.stageId, stage.id));
      const positions = rows.map((r) => r.position).sort((a, b) => a - b);
      expect(positions).toEqual(positions.map((_, i) => i));
    }
  });

  it("uses reserved example domains only", async () => {
    const rows = await db.select({ email: leads.email }).from(leads);
    expect(rows.every((r) => !r.email || r.email.endsWith(".example"))).toBe(true);
  });
});

describe("queries", () => {
  it("builds the dashboard", async () => {
    const { getDashboard } = await import("@/server/queries/dashboard");
    const data = await getDashboard(orgId, adminId);
    expect(data.months).toHaveLength(12);
    expect(data.kpis.openDeals).toBeGreaterThan(0);
    expect(data.kpis.winRate).toBeGreaterThan(0);
    expect(data.kpis.winRate).toBeLessThanOrEqual(1);
  });

  it("filters, sorts and paginates leads", async () => {
    const { listLeads } = await import("@/server/queries/records");
    const base = { page: 1, perPage: 10, dir: "desc" as const, q: undefined, sort: "score", owner: undefined, status: "qualified", source: undefined };
    const page = await listLeads(orgId, adminId, base);
    expect(page.rows.length).toBeLessThanOrEqual(10);
    expect(page.rows.every((r) => r.status === "qualified")).toBe(true);
    const scores = page.rows.map((r) => r.score);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
  });

  it("scopes everything to the organization", async () => {
    const { listContacts } = await import("@/server/queries/records");
    const other = await listContacts(crypto.randomUUID(), adminId, { page: 1, perPage: 10, dir: "desc", q: undefined, sort: undefined, owner: undefined, status: undefined, source: undefined });
    expect(other.total).toBe(0);
  });

  it("escapes LIKE wildcards in search", async () => {
    const { globalSearch } = await import("@/server/queries/records");
    const results = await globalSearch(orgId, "%%");
    expect(Object.values(results).every((r) => r.length === 0)).toBe(true);
  });

  it("returns the board with every stage", async () => {
    const { getBoard } = await import("@/server/queries/records");
    const board = await getBoard(orgId, adminId, {});
    expect(board.map((s) => s.kind)).toEqual(["open", "open", "open", "open", "won", "lost"]);
  });

  it("computes reports", async () => {
    const { getReports } = await import("@/server/queries/insights");
    const r = await getReports(orgId, 365);
    expect(r.totals.wonCount).toBeGreaterThan(0);
    expect(r.byOwner[0]!.won).toBeGreaterThanOrEqual(r.byOwner.at(-1)!.won);
  });
});
