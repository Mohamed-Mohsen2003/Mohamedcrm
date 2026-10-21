import { aliasedTable, and, asc, count, desc, eq, gte, ilike, inArray, isNull, lt, or, sql, type SQL } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";
import { getDb } from "@/lib/db";
import {
  activities,
  companies,
  contacts,
  deals,
  leads,
  notes,
  pipelineStages,
  users,
  leadSourceEnum,
  leadStatusEnum,
  lifecycleEnum,
  activityTypeEnum,
} from "@/lib/db/schema";
import type { ListQuery } from "@/lib/validation/schemas";

const owner = aliasedTable(users, "owner");

export type Paged<T> = { rows: T[]; total: number; page: number; perPage: number; pageCount: number };

function paged<T>(rows: T[], total: number, q: ListQuery): Paged<T> {
  return { rows, total, page: q.page, perPage: q.perPage, pageCount: Math.max(1, Math.ceil(total / q.perPage)) };
}

function sortBy(map: Record<string, PgColumn | SQL>, q: ListQuery, fallback: PgColumn) {
  const col = (q.sort && map[q.sort]) || fallback;
  return q.dir === "asc" ? asc(col) : desc(col);
}

const like = (value: string) => `%${value.replace(/[%_\\]/g, (m) => `\\${m}`)}%`;

const ownerFilter = (column: PgColumn, ownerParam: string | undefined, me: string) => {
  if (!ownerParam) return undefined;
  if (ownerParam === "me") return eq(column, me);
  if (ownerParam === "none") return isNull(column);
  return /^[0-9a-f-]{36}$/i.test(ownerParam) ? eq(column, ownerParam) : undefined;
};

const ownerColumns = { ownerName: owner.name, ownerHue: owner.avatarHue };

/* ------------------------------------------------------------------ */
/* Leads                                                               */
/* ------------------------------------------------------------------ */

export async function listLeads(orgId: string, me: string, q: ListQuery) {
  const db = await getDb();
  const filters = and(
    eq(leads.orgId, orgId),
    q.q
      ? or(
          ilike(leads.firstName, like(q.q)),
          ilike(leads.lastName, like(q.q)),
          ilike(leads.email, like(q.q)),
          ilike(leads.companyName, like(q.q)),
          sql`(${leads.firstName} || ' ' || ${leads.lastName}) ilike ${like(q.q)}`,
        )
      : undefined,
    q.status && (leadStatusEnum.enumValues as readonly string[]).includes(q.status)
      ? eq(leads.status, q.status as (typeof leadStatusEnum.enumValues)[number])
      : q.status === "open"
        ? inArray(leads.status, ["new", "contacted", "qualified"])
        : undefined,
    q.source && (leadSourceEnum.enumValues as readonly string[]).includes(q.source)
      ? eq(leads.source, q.source as (typeof leadSourceEnum.enumValues)[number])
      : undefined,
    ownerFilter(leads.ownerId, q.owner, me),
  );

  const [rows, [{ total } = { total: 0 }]] = await Promise.all([
    db
      .select({
        id: leads.id,
        firstName: leads.firstName,
        lastName: leads.lastName,
        email: leads.email,
        phone: leads.phone,
        companyName: leads.companyName,
        jobTitle: leads.jobTitle,
        source: leads.source,
        status: leads.status,
        score: leads.score,
        estimatedValue: leads.estimatedValue,
        ownerId: leads.ownerId,
        createdAt: leads.createdAt,
        ...ownerColumns,
      })
      .from(leads)
      .leftJoin(owner, eq(leads.ownerId, owner.id))
      .where(filters)
      .orderBy(
        sortBy(
          { name: leads.firstName, company: leads.companyName, score: leads.score, value: leads.estimatedValue, created: leads.createdAt, status: leads.status },
          q,
          leads.createdAt,
        ),
        desc(leads.id),
      )
      .limit(q.perPage)
      .offset((q.page - 1) * q.perPage),
    db.select({ total: count() }).from(leads).where(filters),
  ]);
  return paged(rows, total, q);
}

export async function getLead(orgId: string, id: string) {
  const db = await getDb();
  const [lead] = await db
    .select({ lead: leads, ownerName: owner.name, ownerHue: owner.avatarHue })
    .from(leads)
    .leftJoin(owner, eq(leads.ownerId, owner.id))
    .where(and(eq(leads.orgId, orgId), eq(leads.id, id)))
    .limit(1);
  if (!lead) return null;
  const [timeline, noteList] = await Promise.all([
    activityTimeline(orgId, { leadId: id }),
    notesFor(orgId, "lead", id),
  ]);
  return { ...lead.lead, ownerName: lead.ownerName, ownerHue: lead.ownerHue, timeline, noteItems: noteList };
}

export async function leadStatusCounts(orgId: string) {
  const db = await getDb();
  return db
    .select({ status: leads.status, count: count() })
    .from(leads)
    .where(eq(leads.orgId, orgId))
    .groupBy(leads.status);
}

/* ------------------------------------------------------------------ */
/* Contacts                                                            */
/* ------------------------------------------------------------------ */

export async function listContacts(orgId: string, me: string, q: ListQuery) {
  const db = await getDb();
  const filters = and(
    eq(contacts.orgId, orgId),
    q.q
      ? or(
          ilike(contacts.firstName, like(q.q)),
          ilike(contacts.lastName, like(q.q)),
          ilike(contacts.email, like(q.q)),
          ilike(companies.name, like(q.q)),
          sql`(${contacts.firstName} || ' ' || ${contacts.lastName}) ilike ${like(q.q)}`,
        )
      : undefined,
    q.status && (lifecycleEnum.enumValues as readonly string[]).includes(q.status)
      ? eq(contacts.lifecycle, q.status as (typeof lifecycleEnum.enumValues)[number])
      : undefined,
    ownerFilter(contacts.ownerId, q.owner, me),
  );

  const [rows, [{ total } = { total: 0 }]] = await Promise.all([
    db
      .select({
        id: contacts.id,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        email: contacts.email,
        phone: contacts.phone,
        jobTitle: contacts.jobTitle,
        lifecycle: contacts.lifecycle,
        tags: contacts.tags,
        companyId: contacts.companyId,
        companyName: companies.name,
        ownerId: contacts.ownerId,
        createdAt: contacts.createdAt,
        ...ownerColumns,
      })
      .from(contacts)
      .leftJoin(companies, eq(contacts.companyId, companies.id))
      .leftJoin(owner, eq(contacts.ownerId, owner.id))
      .where(filters)
      .orderBy(
        sortBy({ name: contacts.firstName, company: companies.name, created: contacts.createdAt, lifecycle: contacts.lifecycle }, q, contacts.createdAt),
        desc(contacts.id),
      )
      .limit(q.perPage)
      .offset((q.page - 1) * q.perPage),
    db
      .select({ total: count() })
      .from(contacts)
      .leftJoin(companies, eq(contacts.companyId, companies.id))
      .where(filters),
  ]);
  return paged(rows, total, q);
}

export async function getContact(orgId: string, id: string) {
  const db = await getDb();
  const [row] = await db
    .select({ contact: contacts, companyName: companies.name, companyDomain: companies.domain, ownerName: owner.name, ownerHue: owner.avatarHue })
    .from(contacts)
    .leftJoin(companies, eq(contacts.companyId, companies.id))
    .leftJoin(owner, eq(contacts.ownerId, owner.id))
    .where(and(eq(contacts.orgId, orgId), eq(contacts.id, id)))
    .limit(1);
  if (!row) return null;
  const [dealList, timeline, noteList] = await Promise.all([
    dealsWhere(orgId, eq(deals.contactId, id)),
    activityTimeline(orgId, { contactId: id }),
    notesFor(orgId, "contact", id),
  ]);
  return { ...row.contact, companyName: row.companyName, companyDomain: row.companyDomain, ownerName: row.ownerName, ownerHue: row.ownerHue, deals: dealList, timeline, noteItems: noteList };
}

/* ------------------------------------------------------------------ */
/* Companies                                                           */
/* ------------------------------------------------------------------ */

export async function listCompanies(orgId: string, me: string, q: ListQuery) {
  const db = await getDb();
  const filters = and(
    eq(companies.orgId, orgId),
    q.q ? or(ilike(companies.name, like(q.q)), ilike(companies.domain, like(q.q)), ilike(companies.city, like(q.q))) : undefined,
    q.status ? eq(companies.industry, q.status) : undefined,
    ownerFilter(companies.ownerId, q.owner, me),
  );
  const contactCount = sql<number>`(select count(*)::int from ${contacts} where ${contacts.companyId} = ${companies.id})`;
  const openValue = sql<number>`(select coalesce(sum(d.value), 0)::int from ${deals} d join ${pipelineStages} st on st.id = d.stage_id where d.company_id = ${companies.id} and st.kind = 'open')`;
  const wonValue = sql<number>`(select coalesce(sum(d.value), 0)::int from ${deals} d join ${pipelineStages} st on st.id = d.stage_id where d.company_id = ${companies.id} and st.kind = 'won')`;

  const [rows, [{ total } = { total: 0 }]] = await Promise.all([
    db
      .select({
        id: companies.id,
        name: companies.name,
        domain: companies.domain,
        industry: companies.industry,
        size: companies.size,
        country: companies.country,
        city: companies.city,
        ownerId: companies.ownerId,
        createdAt: companies.createdAt,
        contactCount,
        openValue,
        wonValue,
        ...ownerColumns,
      })
      .from(companies)
      .leftJoin(owner, eq(companies.ownerId, owner.id))
      .where(filters)
      .orderBy(
        sortBy({ name: companies.name, created: companies.createdAt, contacts: contactCount, open: openValue, won: wonValue }, q, companies.createdAt),
        desc(companies.id),
      )
      .limit(q.perPage)
      .offset((q.page - 1) * q.perPage),
    db.select({ total: count() }).from(companies).where(filters),
  ]);
  return paged(rows, total, q);
}

export async function companyIndustries(orgId: string) {
  const db = await getDb();
  const rows = await db
    .selectDistinct({ industry: companies.industry })
    .from(companies)
    .where(and(eq(companies.orgId, orgId), sql`${companies.industry} is not null`))
    .orderBy(asc(companies.industry));
  return rows.map((r) => r.industry!).filter(Boolean);
}

export async function getCompany(orgId: string, id: string) {
  const db = await getDb();
  const [row] = await db
    .select({ company: companies, ownerName: owner.name, ownerHue: owner.avatarHue })
    .from(companies)
    .leftJoin(owner, eq(companies.ownerId, owner.id))
    .where(and(eq(companies.orgId, orgId), eq(companies.id, id)))
    .limit(1);
  if (!row) return null;
  const [people, dealList, timeline, noteList] = await Promise.all([
    db
      .select({ id: contacts.id, firstName: contacts.firstName, lastName: contacts.lastName, email: contacts.email, jobTitle: contacts.jobTitle, lifecycle: contacts.lifecycle })
      .from(contacts)
      .where(and(eq(contacts.orgId, orgId), eq(contacts.companyId, id)))
      .orderBy(asc(contacts.firstName)),
    dealsWhere(orgId, eq(deals.companyId, id)),
    activityTimeline(orgId, { companyId: id }),
    notesFor(orgId, "company", id),
  ]);
  return { ...row.company, ownerName: row.ownerName, ownerHue: row.ownerHue, contacts: people, deals: dealList, timeline, noteItems: noteList };
}

/* ------------------------------------------------------------------ */
/* Deals                                                               */
/* ------------------------------------------------------------------ */

const dealColumns = {
  id: deals.id,
  title: deals.title,
  value: deals.value,
  stageId: deals.stageId,
  position: deals.position,
  priority: deals.priority,
  expectedCloseDate: deals.expectedCloseDate,
  closedAt: deals.closedAt,
  lostReason: deals.lostReason,
  createdAt: deals.createdAt,
  updatedAt: deals.updatedAt,
  ownerId: deals.ownerId,
  contactId: deals.contactId,
  companyId: deals.companyId,
  stageName: pipelineStages.name,
  stageColor: pipelineStages.color,
  stageKind: pipelineStages.kind,
  stageProbability: pipelineStages.probability,
  companyName: companies.name,
  contactFirstName: contacts.firstName,
  contactLastName: contacts.lastName,
  ...ownerColumns,
};

async function dealsWhere(orgId: string, where: SQL | undefined) {
  const db = await getDb();
  return db
    .select(dealColumns)
    .from(deals)
    .innerJoin(pipelineStages, eq(deals.stageId, pipelineStages.id))
    .leftJoin(companies, eq(deals.companyId, companies.id))
    .leftJoin(contacts, eq(deals.contactId, contacts.id))
    .leftJoin(owner, eq(deals.ownerId, owner.id))
    .where(and(eq(deals.orgId, orgId), where))
    .orderBy(desc(deals.updatedAt));
}

export type DealRow = Awaited<ReturnType<typeof dealsWhere>>[number];

export async function getStages(orgId: string) {
  const db = await getDb();
  return db.select().from(pipelineStages).where(eq(pipelineStages.orgId, orgId)).orderBy(asc(pipelineStages.position));
}

export async function getBoard(orgId: string, me: string, filters: { q?: string; owner?: string; priority?: string; closedWithinDays?: number }) {
  const db = await getDb();
  const stages = await getStages(orgId);
  const closedCutoff = new Date(Date.now() - (filters.closedWithinDays ?? 90) * 86_400_000);
  const where = and(
    eq(deals.orgId, orgId),
    filters.q ? or(ilike(deals.title, like(filters.q)), ilike(companies.name, like(filters.q))) : undefined,
    ownerFilter(deals.ownerId, filters.owner, me),
    filters.priority && ["low", "medium", "high"].includes(filters.priority)
      ? eq(deals.priority, filters.priority as "low" | "medium" | "high")
      : undefined,
    // Keep closed columns focused on recent outcomes.
    or(eq(pipelineStages.kind, "open"), gte(deals.closedAt, closedCutoff)),
  );
  const rows = await db
    .select(dealColumns)
    .from(deals)
    .innerJoin(pipelineStages, eq(deals.stageId, pipelineStages.id))
    .leftJoin(companies, eq(deals.companyId, companies.id))
    .leftJoin(contacts, eq(deals.contactId, contacts.id))
    .leftJoin(owner, eq(deals.ownerId, owner.id))
    .where(where)
    .orderBy(asc(deals.position), desc(deals.updatedAt));
  return stages.map((stage) => ({ ...stage, deals: rows.filter((d) => d.stageId === stage.id) }));
}

export async function listDeals(orgId: string, me: string, q: ListQuery) {
  const db = await getDb();
  const filters = and(
    eq(deals.orgId, orgId),
    q.q ? or(ilike(deals.title, like(q.q)), ilike(companies.name, like(q.q))) : undefined,
    q.status && ["open", "won", "lost"].includes(q.status) ? eq(pipelineStages.kind, q.status as "open" | "won" | "lost") : undefined,
    ownerFilter(deals.ownerId, q.owner, me),
  );
  const base = () =>
    db
      .select(dealColumns)
      .from(deals)
      .innerJoin(pipelineStages, eq(deals.stageId, pipelineStages.id))
      .leftJoin(companies, eq(deals.companyId, companies.id))
      .leftJoin(contacts, eq(deals.contactId, contacts.id))
      .leftJoin(owner, eq(deals.ownerId, owner.id));
  const [rows, [{ total } = { total: 0 }]] = await Promise.all([
    base()
      .where(filters)
      .orderBy(
        sortBy({ title: deals.title, value: deals.value, close: deals.expectedCloseDate, stage: pipelineStages.position, created: deals.createdAt, updated: deals.updatedAt }, q, deals.updatedAt),
        desc(deals.id),
      )
      .limit(q.perPage)
      .offset((q.page - 1) * q.perPage),
    db
      .select({ total: count() })
      .from(deals)
      .innerJoin(pipelineStages, eq(deals.stageId, pipelineStages.id))
      .leftJoin(companies, eq(deals.companyId, companies.id))
      .where(filters),
  ]);
  return paged(rows, total, q);
}

export async function getDeal(orgId: string, id: string) {
  const rows = await dealsWhere(orgId, eq(deals.id, id));
  const deal = rows[0];
  if (!deal) return null;
  const [timeline, noteList] = await Promise.all([activityTimeline(orgId, { dealId: id }), notesFor(orgId, "deal", id)]);
  return { ...deal, timeline, noteItems: noteList };
}

/* ------------------------------------------------------------------ */
/* Activities                                                          */
/* ------------------------------------------------------------------ */

const activityColumns = {
  id: activities.id,
  type: activities.type,
  subject: activities.subject,
  description: activities.description,
  dueAt: activities.dueAt,
  completedAt: activities.completedAt,
  ownerId: activities.ownerId,
  dealId: activities.dealId,
  contactId: activities.contactId,
  companyId: activities.companyId,
  leadId: activities.leadId,
  createdAt: activities.createdAt,
  dealTitle: deals.title,
  contactFirstName: contacts.firstName,
  contactLastName: contacts.lastName,
  companyName: companies.name,
  leadFirstName: leads.firstName,
  leadLastName: leads.lastName,
  ...ownerColumns,
};

function activityBase(db: Awaited<ReturnType<typeof getDb>>) {
  return db
    .select(activityColumns)
    .from(activities)
    .leftJoin(deals, eq(activities.dealId, deals.id))
    .leftJoin(contacts, eq(activities.contactId, contacts.id))
    .leftJoin(companies, eq(activities.companyId, companies.id))
    .leftJoin(leads, eq(activities.leadId, leads.id))
    .leftJoin(owner, eq(activities.ownerId, owner.id));
}

export type ActivityRow = Awaited<ReturnType<ReturnType<typeof activityBase>["execute"]>>[number];

async function activityTimeline(orgId: string, link: { dealId?: string; contactId?: string; companyId?: string; leadId?: string }) {
  const db = await getDb();
  const key = Object.keys(link)[0] as keyof typeof link;
  const column = { dealId: activities.dealId, contactId: activities.contactId, companyId: activities.companyId, leadId: activities.leadId }[key];
  return activityBase(db)
    .where(and(eq(activities.orgId, orgId), eq(column, link[key]!)))
    .orderBy(desc(sql`coalesce(${activities.completedAt}, ${activities.dueAt}, ${activities.createdAt})`))
    .limit(50);
}

export type ActivityView = "overdue" | "today" | "upcoming" | "completed" | "all";

export async function listActivities(orgId: string, me: string, opts: { view: ActivityView; type?: string; owner?: string; page: number; perPage: number }) {
  const db = await getDb();
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayEnd = new Date(dayStart.getTime() + 86_400_000);
  const viewFilter = {
    overdue: and(lt(activities.dueAt, dayStart), isNull(activities.completedAt)),
    today: and(gte(activities.dueAt, dayStart), lt(activities.dueAt, dayEnd)),
    upcoming: and(gte(activities.dueAt, dayEnd), isNull(activities.completedAt)),
    completed: sql`${activities.completedAt} is not null`,
    all: undefined,
  }[opts.view];
  const filters = and(
    eq(activities.orgId, orgId),
    viewFilter,
    opts.type && (activityTypeEnum.enumValues as readonly string[]).includes(opts.type)
      ? eq(activities.type, opts.type as (typeof activityTypeEnum.enumValues)[number])
      : undefined,
    ownerFilter(activities.ownerId, opts.owner ?? "me", me),
  );
  const order =
    opts.view === "completed" ? [desc(activities.completedAt)] : opts.view === "overdue" ? [desc(activities.dueAt)] : [asc(activities.dueAt)];
  const [rows, [{ total } = { total: 0 }]] = await Promise.all([
    activityBase(db)
      .where(filters)
      .orderBy(...order, desc(activities.id))
      .limit(opts.perPage)
      .offset((opts.page - 1) * opts.perPage),
    db.select({ total: count() }).from(activities).where(filters),
  ]);
  return { rows, total, page: opts.page, perPage: opts.perPage, pageCount: Math.max(1, Math.ceil(total / opts.perPage)) };
}

export async function activityCounts(orgId: string, ownerId: string | undefined) {
  const db = await getDb();
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayEnd = new Date(dayStart.getTime() + 86_400_000);
  const iso = (d: Date) => sql`${d.toISOString()}::timestamptz`;
  const [row] = await db
    .select({
      overdue: sql<number>`count(*) filter (where ${activities.dueAt} < ${iso(dayStart)} and ${activities.completedAt} is null)::int`,
      today: sql<number>`count(*) filter (where ${activities.dueAt} >= ${iso(dayStart)} and ${activities.dueAt} < ${iso(dayEnd)})::int`,
      upcoming: sql<number>`count(*) filter (where ${activities.dueAt} >= ${iso(dayEnd)} and ${activities.completedAt} is null)::int`,
      completed: sql<number>`count(*) filter (where ${activities.completedAt} is not null)::int`,
      all: sql<number>`count(*)::int`,
    })
    .from(activities)
    .where(and(eq(activities.orgId, orgId), ownerId ? eq(activities.ownerId, ownerId) : undefined));
  return row ?? { overdue: 0, today: 0, upcoming: 0, completed: 0, all: 0 };
}

/* ------------------------------------------------------------------ */
/* Notes                                                               */
/* ------------------------------------------------------------------ */

async function notesFor(orgId: string, entityType: "lead" | "contact" | "company" | "deal", entityId: string) {
  const db = await getDb();
  return db
    .select({ id: notes.id, body: notes.body, createdAt: notes.createdAt, authorId: notes.authorId, authorName: owner.name, authorHue: owner.avatarHue })
    .from(notes)
    .leftJoin(owner, eq(notes.authorId, owner.id))
    .where(and(eq(notes.orgId, orgId), eq(notes.entityType, entityType), eq(notes.entityId, entityId)))
    .orderBy(desc(notes.createdAt));
}

/* ------------------------------------------------------------------ */
/* Lookups                                                             */
/* ------------------------------------------------------------------ */

export async function getLookups(orgId: string) {
  const db = await getDb();
  const [team, companyOptions, contactOptions, stages] = await Promise.all([
    db
      .select({ id: users.id, name: users.name, avatarHue: users.avatarHue, role: users.role })
      .from(users)
      .where(and(eq(users.orgId, orgId), eq(users.isActive, true)))
      .orderBy(asc(users.name)),
    db.select({ id: companies.id, name: companies.name }).from(companies).where(eq(companies.orgId, orgId)).orderBy(asc(companies.name)),
    db
      .select({ id: contacts.id, firstName: contacts.firstName, lastName: contacts.lastName, companyId: contacts.companyId })
      .from(contacts)
      .where(eq(contacts.orgId, orgId))
      .orderBy(asc(contacts.firstName)),
    getStages(orgId),
  ]);
  return {
    team,
    companies: companyOptions,
    contacts: contactOptions.map((c) => ({ id: c.id, name: `${c.firstName} ${c.lastName}`, companyId: c.companyId })),
    stages,
  };
}

export type Lookups = Awaited<ReturnType<typeof getLookups>>;

/* ------------------------------------------------------------------ */
/* Global search                                                       */
/* ------------------------------------------------------------------ */

export async function globalSearch(orgId: string, term: string) {
  const db = await getDb();
  const t = term.trim();
  if (t.length < 2) return { leads: [], contacts: [], companies: [], deals: [] };
  const pattern = like(t);
  const [leadRows, contactRows, companyRows, dealRows] = await Promise.all([
    db
      .select({ id: leads.id, title: sql<string>`${leads.firstName} || ' ' || ${leads.lastName}`, subtitle: leads.companyName })
      .from(leads)
      .where(and(eq(leads.orgId, orgId), or(sql`(${leads.firstName} || ' ' || ${leads.lastName}) ilike ${pattern}`, ilike(leads.email, pattern), ilike(leads.companyName, pattern))))
      .limit(5),
    db
      .select({ id: contacts.id, title: sql<string>`${contacts.firstName} || ' ' || ${contacts.lastName}`, subtitle: contacts.email })
      .from(contacts)
      .where(and(eq(contacts.orgId, orgId), or(sql`(${contacts.firstName} || ' ' || ${contacts.lastName}) ilike ${pattern}`, ilike(contacts.email, pattern))))
      .limit(5),
    db
      .select({ id: companies.id, title: companies.name, subtitle: companies.domain })
      .from(companies)
      .where(and(eq(companies.orgId, orgId), or(ilike(companies.name, pattern), ilike(companies.domain, pattern))))
      .limit(5),
    db
      .select({ id: deals.id, title: deals.title, subtitle: pipelineStages.name, value: deals.value })
      .from(deals)
      .innerJoin(pipelineStages, eq(deals.stageId, pipelineStages.id))
      .where(and(eq(deals.orgId, orgId), ilike(deals.title, pattern)))
      .limit(5),
  ]);
  return { leads: leadRows, contacts: contactRows, companies: companyRows, deals: dealRows };
}

export type SearchResults = Awaited<ReturnType<typeof globalSearch>>;
