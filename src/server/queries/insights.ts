import { and, asc, count, desc, eq, gte, isNotNull, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { activities, auditLogs, deals, leads, pipelineStages, users } from "@/lib/db/schema";

const iso = (d: Date) => sql`${d.toISOString()}::timestamptz`;

export async function getReports(orgId: string, rangeDays: number) {
  const db = await getDb();
  const now = new Date();
  const since = new Date(now.getTime() - rangeDays * 86_400_000);

  const [byOwner, lostReasons, sourceFunnel, forecast, activityMix, stageVelocity] = await Promise.all([
    db
      .select({
        id: users.id,
        name: users.name,
        avatarHue: users.avatarHue,
        won: sql<number>`coalesce(sum(${deals.value}) filter (where ${pipelineStages.kind} = 'won'), 0)::int`,
        wonCount: sql<number>`count(${deals.id}) filter (where ${pipelineStages.kind} = 'won')::int`,
        lostCount: sql<number>`count(${deals.id}) filter (where ${pipelineStages.kind} = 'lost')::int`,
      })
      .from(users)
      .leftJoin(deals, and(eq(deals.ownerId, users.id), gte(deals.closedAt, since)))
      .leftJoin(pipelineStages, eq(deals.stageId, pipelineStages.id))
      .where(and(eq(users.orgId, orgId), eq(users.isActive, true)))
      .groupBy(users.id)
      .orderBy(desc(sql`coalesce(sum(${deals.value}) filter (where ${pipelineStages.kind} = 'won'), 0)`)),

    db
      .select({ reason: deals.lostReason, count: count(), value: sql<number>`coalesce(sum(${deals.value}),0)::int` })
      .from(deals)
      .innerJoin(pipelineStages, eq(deals.stageId, pipelineStages.id))
      .where(and(eq(deals.orgId, orgId), eq(pipelineStages.kind, "lost"), gte(deals.closedAt, since)))
      .groupBy(deals.lostReason)
      .orderBy(desc(count())),

    db
      .select({
        source: leads.source,
        total: count(),
        contacted: sql<number>`count(*) filter (where ${leads.status} <> 'new')::int`,
        qualified: sql<number>`count(*) filter (where ${leads.status} in ('qualified','converted'))::int`,
        converted: sql<number>`count(*) filter (where ${leads.status} = 'converted')::int`,
        value: sql<number>`coalesce(sum(${leads.estimatedValue}),0)::int`,
      })
      .from(leads)
      .where(and(eq(leads.orgId, orgId), gte(leads.createdAt, since)))
      .groupBy(leads.source)
      .orderBy(desc(count())),

    // Weighted forecast by expected close month (next 3 months + overdue bucket).
    db
      .select({
        month: sql<string>`case when ${deals.expectedCloseDate} < current_date then 'overdue' else to_char(${deals.expectedCloseDate}, 'YYYY-MM') end`,
        value: sql<number>`coalesce(sum(${deals.value}),0)::int`,
        weighted: sql<number>`coalesce(sum(${deals.value} * ${pipelineStages.probability} / 100.0),0)::int`,
        count: count(),
      })
      .from(deals)
      .innerJoin(pipelineStages, eq(deals.stageId, pipelineStages.id))
      .where(
        and(
          eq(deals.orgId, orgId),
          eq(pipelineStages.kind, "open"),
          isNotNull(deals.expectedCloseDate),
          sql`${deals.expectedCloseDate} < (date_trunc('month', current_date) + interval '3 months')`,
        ),
      )
      .groupBy(sql`1`)
      .orderBy(sql`1`),

    db
      .select({
        type: activities.type,
        total: count(),
        done: sql<number>`count(*) filter (where ${activities.completedAt} is not null)::int`,
      })
      .from(activities)
      .where(and(eq(activities.orgId, orgId), sql`coalesce(${activities.dueAt}, ${activities.createdAt}) >= ${iso(since)}`))
      .groupBy(activities.type),

    db
      .select({
        id: pipelineStages.id,
        name: pipelineStages.name,
        color: pipelineStages.color,
        probability: pipelineStages.probability,
        count: sql<number>`count(${deals.id})::int`,
        value: sql<number>`coalesce(sum(${deals.value}),0)::int`,
        avgAge: sql<number>`coalesce(avg(extract(epoch from (now() - ${deals.updatedAt})) / 86400), 0)::int`,
      })
      .from(pipelineStages)
      .leftJoin(deals, eq(deals.stageId, pipelineStages.id))
      .where(and(eq(pipelineStages.orgId, orgId), eq(pipelineStages.kind, "open")))
      .groupBy(pipelineStages.id)
      .orderBy(asc(pipelineStages.position)),
  ]);

  const totals = byOwner.reduce(
    (acc, r) => ({ won: acc.won + r.won, wonCount: acc.wonCount + r.wonCount, lostCount: acc.lostCount + r.lostCount }),
    { won: 0, wonCount: 0, lostCount: 0 },
  );

  return { byOwner, lostReasons, sourceFunnel, forecast, activityMix, stageVelocity, totals };
}

export type ReportsData = Awaited<ReturnType<typeof getReports>>;

export async function getTeam(orgId: string) {
  const db = await getDb();
  // Fully-qualified reference: single-table selects are emitted without table prefixes.
  const userIdRef = sql.raw('"users"."id"');
  const since = new Date(Date.now() - 90 * 86_400_000);
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      title: users.title,
      avatarHue: users.avatarHue,
      isActive: users.isActive,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
      openDeals: sql<number>`(select count(*)::int from ${deals} d join ${pipelineStages} st on st.id = d.stage_id where d.owner_id = ${userIdRef} and st.kind = 'open')`,
      wonValue: sql<number>`(select coalesce(sum(d.value),0)::int from ${deals} d join ${pipelineStages} st on st.id = d.stage_id where d.owner_id = ${userIdRef} and st.kind = 'won' and d.closed_at >= ${iso(since)})`,
    })
    .from(users)
    .where(eq(users.orgId, orgId))
    .orderBy(asc(users.createdAt));
}

export async function listAudit(orgId: string, opts: { page: number; perPage: number; entity?: string }) {
  const db = await getDb();
  const entityTypes = ["lead", "contact", "company", "deal", "activity", "user", "stage"] as const;
  const filter = and(
    eq(auditLogs.orgId, orgId),
    opts.entity && (entityTypes as readonly string[]).includes(opts.entity)
      ? eq(auditLogs.entityType, opts.entity as (typeof entityTypes)[number])
      : undefined,
  );
  const [rows, [{ total } = { total: 0 }]] = await Promise.all([
    db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        entityLabel: auditLogs.entityLabel,
        meta: auditLogs.meta,
        createdAt: auditLogs.createdAt,
        actorName: users.name,
        actorHue: users.avatarHue,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.actorId, users.id))
      .where(filter)
      .orderBy(desc(auditLogs.createdAt))
      .limit(opts.perPage)
      .offset((opts.page - 1) * opts.perPage),
    db.select({ total: count() }).from(auditLogs).where(filter),
  ]);
  return { rows, total, page: opts.page, perPage: opts.perPage, pageCount: Math.max(1, Math.ceil(total / opts.perPage)) };
}

export type AuditRow = Awaited<ReturnType<typeof listAudit>>["rows"][number];
