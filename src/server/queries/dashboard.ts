import { and, asc, desc, eq, gte, isNotNull, isNull, lt, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { activities, auditLogs, deals, leads, pipelineStages, users } from "@/lib/db/schema";

const DAY = 86_400_000;

/** Date parameter for raw SQL fragments (driver-agnostic). */
const ts = (d: Date) => sql`${d.toISOString()}::timestamptz`;

function startOfMonth(d: Date, offset = 0) {
  return new Date(d.getFullYear(), d.getMonth() + offset, 1);
}
function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export async function getDashboard(orgId: string, userId: string, now = new Date()) {
  const db = await getDb();
  const monthStart = startOfMonth(now);
  const lastMonthStart = startOfMonth(now, -1);
  const yearAgo = startOfMonth(now, -11);
  const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
  const dayStart = startOfDay(now);
  const dayEnd = new Date(dayStart.getTime() + DAY);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * DAY);

  const [pipeline, closedStats, leadStats, monthly, byStage, bySource, leaderboard, agenda, overdue, feed] =
    await Promise.all([
      // Open pipeline value + weighted value.
      db
        .select({
          count: sql<number>`count(*)::int`,
          value: sql<number>`coalesce(sum(${deals.value}), 0)::int`,
          weighted: sql<number>`coalesce(sum(${deals.value} * ${pipelineStages.probability} / 100.0), 0)::int`,
        })
        .from(deals)
        .innerJoin(pipelineStages, eq(deals.stageId, pipelineStages.id))
        .where(and(eq(deals.orgId, orgId), eq(pipelineStages.kind, "open"))),

      // Won this month / last month, win rate & cycle over the trailing 90 days.
      db
        .select({
          wonThisMonth: sql<number>`coalesce(sum(case when ${pipelineStages.kind} = 'won' and ${deals.closedAt} >= ${ts(monthStart)} then ${deals.value} end), 0)::int`,
          wonLastMonth: sql<number>`coalesce(sum(case when ${pipelineStages.kind} = 'won' and ${deals.closedAt} >= ${ts(lastMonthStart)} and ${deals.closedAt} < ${ts(monthStart)} then ${deals.value} end), 0)::int`,
          won90: sql<number>`count(*) filter (where ${pipelineStages.kind} = 'won' and ${deals.closedAt} >= ${ts(ninetyDaysAgo)})::int`,
          lost90: sql<number>`count(*) filter (where ${pipelineStages.kind} = 'lost' and ${deals.closedAt} >= ${ts(ninetyDaysAgo)})::int`,
          avgWon: sql<number>`coalesce(avg(${deals.value}) filter (where ${pipelineStages.kind} = 'won'), 0)::int`,
          avgCycle: sql<number>`coalesce(avg(extract(epoch from (${deals.closedAt} - ${deals.createdAt})) / 86400) filter (where ${pipelineStages.kind} = 'won'), 0)::int`,
        })
        .from(deals)
        .innerJoin(pipelineStages, eq(deals.stageId, pipelineStages.id))
        .where(and(eq(deals.orgId, orgId), isNotNull(deals.closedAt))),

      db
        .select({
          thisMonth: sql<number>`count(*) filter (where ${leads.createdAt} >= ${ts(monthStart)})::int`,
          lastMonth: sql<number>`count(*) filter (where ${leads.createdAt} >= ${ts(lastMonthStart)} and ${leads.createdAt} < ${ts(monthStart)})::int`,
          open: sql<number>`count(*) filter (where ${leads.status} in ('new','contacted','qualified'))::int`,
        })
        .from(leads)
        .where(eq(leads.orgId, orgId)),

      // Won revenue by month (trailing 12 months).
      db
        .select({
          month: sql<string>`to_char(date_trunc('month', ${deals.closedAt}), 'YYYY-MM')`,
          won: sql<number>`coalesce(sum(${deals.value}) filter (where ${pipelineStages.kind} = 'won'), 0)::int`,
          lost: sql<number>`coalesce(sum(${deals.value}) filter (where ${pipelineStages.kind} = 'lost'), 0)::int`,
          deals: sql<number>`count(*) filter (where ${pipelineStages.kind} = 'won')::int`,
        })
        .from(deals)
        .innerJoin(pipelineStages, eq(deals.stageId, pipelineStages.id))
        .where(and(eq(deals.orgId, orgId), gte(deals.closedAt, yearAgo)))
        .groupBy(sql`1`)
        .orderBy(sql`1`),

      db
        .select({
          id: pipelineStages.id,
          name: pipelineStages.name,
          color: pipelineStages.color,
          kind: pipelineStages.kind,
          count: sql<number>`count(${deals.id})::int`,
          value: sql<number>`coalesce(sum(${deals.value}), 0)::int`,
        })
        .from(pipelineStages)
        .leftJoin(deals, eq(deals.stageId, pipelineStages.id))
        .where(eq(pipelineStages.orgId, orgId))
        .groupBy(pipelineStages.id)
        .orderBy(asc(pipelineStages.position)),

      db
        .select({
          source: leads.source,
          total: sql<number>`count(*)::int`,
          qualified: sql<number>`count(*) filter (where ${leads.status} in ('qualified','converted'))::int`,
        })
        .from(leads)
        .where(eq(leads.orgId, orgId))
        .groupBy(leads.source)
        .orderBy(desc(sql`count(*)`)),

      db
        .select({
          id: users.id,
          name: users.name,
          title: users.title,
          avatarHue: users.avatarHue,
          won: sql<number>`coalesce(sum(${deals.value}), 0)::int`,
          count: sql<number>`count(${deals.id})::int`,
        })
        .from(users)
        .leftJoin(
          deals,
          and(
            eq(deals.ownerId, users.id),
            gte(deals.closedAt, quarterStart),
            sql`${deals.stageId} in (select id from pipeline_stages where kind = 'won' and org_id = ${orgId})`,
          ),
        )
        .where(and(eq(users.orgId, orgId), eq(users.isActive, true)))
        .groupBy(users.id)
        .orderBy(desc(sql`coalesce(sum(${deals.value}), 0)`))
        .limit(6),

      db
        .select({
          id: activities.id,
          type: activities.type,
          subject: activities.subject,
          dueAt: activities.dueAt,
          completedAt: activities.completedAt,
          dealId: activities.dealId,
          dealTitle: deals.title,
        })
        .from(activities)
        .leftJoin(deals, eq(activities.dealId, deals.id))
        .where(
          and(
            eq(activities.orgId, orgId),
            eq(activities.ownerId, userId),
            gte(activities.dueAt, dayStart),
            lt(activities.dueAt, dayEnd),
          ),
        )
        .orderBy(asc(activities.dueAt))
        .limit(8),

      db
        .select({ count: sql<number>`count(*)::int` })
        .from(activities)
        .where(
          and(
            eq(activities.orgId, orgId),
            eq(activities.ownerId, userId),
            lt(activities.dueAt, dayStart),
            isNull(activities.completedAt),
          ),
        ),

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
        .where(eq(auditLogs.orgId, orgId))
        .orderBy(desc(auditLogs.createdAt))
        .limit(8),
    ]);

  // Fill gaps so the revenue chart always has 12 points.
  const months: Array<{ month: string; won: number; lost: number; deals: number }> = [];
  for (let i = 11; i >= 0; i--) {
    const d = startOfMonth(now, -i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const row = monthly.find((m) => m.month === key);
    months.push({ month: key, won: row?.won ?? 0, lost: row?.lost ?? 0, deals: row?.deals ?? 0 });
  }

  const closed = closedStats[0]!;
  const decided = closed.won90 + closed.lost90;

  return {
    kpis: {
      pipelineValue: pipeline[0]?.value ?? 0,
      weightedPipeline: pipeline[0]?.weighted ?? 0,
      openDeals: pipeline[0]?.count ?? 0,
      wonThisMonth: closed.wonThisMonth,
      wonLastMonth: closed.wonLastMonth,
      winRate: decided ? closed.won90 / decided : 0,
      avgDealSize: closed.avgWon,
      avgCycleDays: closed.avgCycle,
      newLeads: leadStats[0]?.thisMonth ?? 0,
      newLeadsLastMonth: leadStats[0]?.lastMonth ?? 0,
      openLeads: leadStats[0]?.open ?? 0,
    },
    months,
    byStage,
    bySource,
    leaderboard,
    agenda,
    overdueCount: overdue[0]?.count ?? 0,
    feed,
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboard>>;
