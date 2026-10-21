import bcrypt from "bcryptjs";
import { Faker, en } from "@faker-js/faker";
import { sql } from "drizzle-orm";
import type { Database } from "./index";
import * as s from "./schema";

/**
 * Deterministic demo dataset. Every record is fictional — names, companies,
 * e-mails and phone numbers are generated and use reserved `.example` domains.
 * Dates are generated relative to "now" so the demo always looks current.
 */

export const DEMO_PASSWORD = "demo1234";

export const DEMO_ACCOUNTS = [
  { email: "admin@nexora.demo", role: "admin" as const },
  { email: "manager@nexora.demo", role: "manager" as const },
  { email: "rep@nexora.demo", role: "rep" as const },
];

const FIRST_NAMES = [
  "Omar", "Laila", "Youssef", "Mariam", "Karim", "Hana", "Ziad", "Nour", "Adam", "Salma",
  "Tariq", "Rania", "Daniel", "Emma", "Lucas", "Sofia", "Noah", "Amelia", "Ethan", "Chloe",
  "Khalid", "Aisha", "Hassan", "Yara", "Rami", "Dina", "Fadi", "Lina", "Samir", "Huda",
  "Marco", "Giulia", "Jonas", "Clara", "Mateo", "Elena", "Liam", "Maya", "Victor", "Ines",
];

const LAST_NAMES = [
  "Haddad", "Mansour", "Farouk", "Saleh", "Nabil", "Kamal", "Adel", "Khoury", "Rahman", "Aziz",
  "Brooks", "Turner", "Fischer", "Rossi", "Moreau", "Novak", "Larsen", "Costa", "Weber", "Hughes",
  "Al-Amin", "El-Sayed", "Barakat", "Nasser", "Hamdan", "Suleiman", "Qasim", "Darwish", "Zaki", "Fouad",
];

const COMPANY_PREFIX = [
  "Atlas", "Nile", "Cedar", "Orbit", "Falcon", "Oasis", "Summit", "Harbor", "Vertex", "Lumen",
  "Delta", "Mosaic", "Northwind", "Silverline", "Bluegate", "Crescent", "Pioneer", "Redwood",
  "Sahara", "Meridian", "Granite", "Horizon", "Ivory", "Juniper", "Keystone", "Lattice",
];
const COMPANY_SUFFIX = [
  "Logistics", "Health", "Labs", "Foods", "Energy", "Retail", "Capital", "Systems", "Studios",
  "Telecom", "Realty", "Motors", "Analytics", "Pharma", "Hospitality", "Education", "Textiles",
];
const INDUSTRY_BY_SUFFIX: Record<string, string> = {
  Logistics: "Logistics", Health: "Healthcare", Labs: "Technology", Foods: "Food & Beverage",
  Energy: "Energy", Retail: "Retail", Capital: "Financial Services", Systems: "Technology",
  Studios: "Media", Telecom: "Telecommunications", Realty: "Real Estate", Motors: "Automotive",
  Analytics: "Technology", Pharma: "Healthcare", Hospitality: "Hospitality", Education: "Education",
  Textiles: "Manufacturing",
};
const LOCATIONS: Array<[string, string]> = [
  ["Egypt", "Cairo"], ["Egypt", "Alexandria"], ["Saudi Arabia", "Riyadh"], ["Saudi Arabia", "Jeddah"],
  ["United Arab Emirates", "Dubai"], ["United Arab Emirates", "Abu Dhabi"], ["Qatar", "Doha"],
  ["Kuwait", "Kuwait City"], ["Jordan", "Amman"], ["United States", "Austin"],
  ["United States", "New York"], ["United Kingdom", "London"], ["Germany", "Berlin"],
  ["France", "Paris"], ["Netherlands", "Amsterdam"], ["Spain", "Madrid"],
];
const SIZES = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"];
const JOB_TITLES = [
  "CEO", "COO", "CTO", "Head of Operations", "Procurement Manager", "Marketing Director",
  "IT Manager", "Finance Director", "Sales Director", "Product Manager", "General Manager",
  "Operations Lead", "Head of Growth", "Purchasing Officer", "Founder",
];
const DEAL_PRODUCTS = [
  "Annual license", "Enterprise rollout", "Pilot program", "Support renewal", "Onboarding package",
  "Platform upgrade", "Multi-branch expansion", "Analytics add-on", "Integration project",
  "Training workshop", "Fleet subscription", "Starter plan",
];
const LOST_REASONS = ["Price too high", "Chose a competitor", "No budget this year", "No decision", "Timing"];
const TAGS = ["vip", "decision-maker", "newsletter", "partner", "renewal", "trial", "event-2026"];
const CALL_SUBJECTS = ["Discovery call", "Follow-up call", "Pricing discussion", "Check-in call", "Renewal call"];
const MEETING_SUBJECTS = ["Product demo", "Stakeholder meeting", "Contract review", "Kick-off meeting", "Quarterly review"];
const EMAIL_SUBJECTS = ["Send proposal", "Share case study", "Send contract draft", "Intro email", "Recap email"];
const TASK_SUBJECTS = ["Prepare quote", "Update CRM notes", "Research account", "Book demo room", "Draft SOW"];
const NOTE_BODIES = [
  "Budget approved for Q1. Decision expected after the board meeting.",
  "Prefers WhatsApp for quick updates; formal approvals over e-mail.",
  "Comparing us with two competitors — our reporting module is the differentiator.",
  "Asked for an Arabic onboarding session for the branch teams.",
  "Legal team needs the DPA before signing.",
  "Champion is the operations lead; CFO is the economic buyer.",
  "Interested in a phased rollout starting with three branches.",
  "Requested references from a customer in the same industry.",
];

const STAGES = [
  { name: "Prospecting", probability: 10, kind: "open", color: "sky" },
  { name: "Qualification", probability: 25, kind: "open", color: "iris" },
  { name: "Proposal", probability: 50, kind: "open", color: "saffron" },
  { name: "Negotiation", probability: 75, kind: "open", color: "coral" },
  { name: "Closed won", probability: 100, kind: "won", color: "jade" },
  { name: "Closed lost", probability: 0, kind: "lost", color: "slate" },
] as const;

const TEAM = [
  { name: "Laila Haddad", email: "admin@nexora.demo", role: "admin", title: "Head of Sales", hue: 165 },
  { name: "Omar Farouk", email: "manager@nexora.demo", role: "manager", title: "Sales Manager", hue: 260 },
  { name: "Sara Nabil", email: "rep@nexora.demo", role: "rep", title: "Account Executive", hue: 30 },
  { name: "Youssef Kamal", email: "youssef@nexora.demo", role: "rep", title: "Account Executive", hue: 200 },
  { name: "Emma Turner", email: "emma@nexora.demo", role: "rep", title: "Sales Development Rep", hue: 330 },
  { name: "Karim Adel", email: "karim@nexora.demo", role: "rep", title: "Account Executive", hue: 95 },
  { name: "Daniel Brooks", email: "daniel@nexora.demo", role: "manager", title: "Partnerships Manager", hue: 15 },
] as const;

const DAY = 86_400_000;

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function seedIfEmpty(db: Database) {
  const existing = await db.select({ count: sql<number>`count(*)::int` }).from(s.organizations);
  if ((existing[0]?.count ?? 0) > 0) return false;
  await seed(db);
  return true;
}

export async function resetDatabase(db: Database) {
  await db.execute(
    sql`TRUNCATE audit_logs, notes, activities, deals, pipeline_stages, leads, contacts, companies, users, organizations RESTART IDENTITY CASCADE`,
  );
  await seed(db);
}

export async function seed(db: Database, opts: { now?: Date } = {}) {
  const faker = new Faker({ locale: [en] });
  faker.seed(20261021);
  const now = opts.now ?? new Date();
  const ago = (days: number) => new Date(now.getTime() - days * DAY);
  const ahead = (days: number) => new Date(now.getTime() + days * DAY);
  const pick = <T,>(items: readonly T[]) => faker.helpers.arrayElement(items);

  /* Organization & team ------------------------------------------------ */
  const [org] = await db
    .insert(s.organizations)
    .values({ name: "Nexora Demo Co.", slug: "nexora-demo", currency: "USD", createdAt: ago(400) })
    .returning();
  if (!org) throw new Error("Failed to create organization");

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const team = await db
    .insert(s.users)
    .values(
      TEAM.map((m, i) => ({
        orgId: org.id,
        name: m.name,
        email: m.email,
        passwordHash,
        role: m.role,
        title: m.title,
        avatarHue: m.hue,
        createdAt: ago(380 - i * 20),
        lastLoginAt: ago(i % 3),
      })),
    )
    .returning();
  const sellers = team.filter((u) => u.role !== "admin");
  // Reps carry most of the book; weight them so the leaderboard is interesting.
  const ownerPool = [...sellers, ...sellers.filter((u) => u.role === "rep"), team[2]!, team[2]!];

  /* Pipeline ----------------------------------------------------------- */
  const stages = await db
    .insert(s.pipelineStages)
    .values(STAGES.map((st, position) => ({ ...st, orgId: org.id, position })))
    .returning();
  const openStages = stages.filter((st) => st.kind === "open");
  const wonStage = stages.find((st) => st.kind === "won")!;
  const lostStage = stages.find((st) => st.kind === "lost")!;

  /* Companies ---------------------------------------------------------- */
  const usedNames = new Set<string>();
  const companyRows: (typeof s.companies.$inferInsert)[] = [];
  while (companyRows.length < 48) {
    const suffix = pick(COMPANY_SUFFIX);
    const name = `${pick(COMPANY_PREFIX)} ${suffix}`;
    if (usedNames.has(name)) continue;
    usedNames.add(name);
    const [country, city] = pick(LOCATIONS);
    const created = ago(faker.number.int({ min: 30, max: 380 }));
    companyRows.push({
      orgId: org.id,
      name,
      domain: `${slugify(name)}.example`,
      industry: INDUSTRY_BY_SUFFIX[suffix] ?? "Technology",
      size: pick(SIZES),
      country,
      city,
      phone: faker.phone.number({ style: "international" }),
      annualRevenue: faker.number.int({ min: 2, max: 900 }) * 100_000,
      ownerId: pick(ownerPool).id,
      createdAt: created,
      updatedAt: created,
    });
  }
  const companyList = await db.insert(s.companies).values(companyRows).returning();

  /* Contacts ----------------------------------------------------------- */
  const contactRows: (typeof s.contacts.$inferInsert)[] = [];
  for (const company of companyList) {
    const count = faker.number.int({ min: 2, max: 4 });
    for (let i = 0; i < count; i++) {
      const firstName = pick(FIRST_NAMES);
      const lastName = pick(LAST_NAMES);
      const created = new Date(company.createdAt.getTime() + faker.number.int({ min: 0, max: 20 }) * DAY);
      contactRows.push({
        orgId: org.id,
        companyId: company.id,
        firstName,
        lastName,
        email: `${slugify(firstName)}.${slugify(lastName)}@${company.domain}`,
        phone: faker.phone.number({ style: "international" }),
        jobTitle: pick(JOB_TITLES),
        lifecycle: faker.helpers.weightedArrayElement([
          { value: "lead" as const, weight: 3 },
          { value: "opportunity" as const, weight: 4 },
          { value: "customer" as const, weight: 3 },
          { value: "churned" as const, weight: 1 },
        ]),
        tags: faker.helpers.arrayElements(TAGS, { min: 0, max: 2 }),
        ownerId: company.ownerId,
        createdAt: created,
        updatedAt: created,
      });
    }
  }
  const contactList = await db.insert(s.contacts).values(contactRows).returning();

  /* Deals -------------------------------------------------------------- */
  const dealRows: (typeof s.deals.$inferInsert)[] = [];
  const positions = new Map<string, number>();
  const nextPosition = (stageId: string) => {
    const p = positions.get(stageId) ?? 0;
    positions.set(stageId, p + 1);
    return p;
  };

  // Closed deals spread over the last 12 months with a gentle growth trend.
  for (let month = 11; month >= 0; month--) {
    const wonCount = 3 + Math.round((11 - month) * 0.45) + faker.number.int({ min: 0, max: 2 });
    const lostCount = faker.number.int({ min: 3, max: 7 });
    for (let i = 0; i < wonCount + lostCount; i++) {
      const won = i < wonCount;
      const contact = pick(contactList);
      const closedAt = ago(month * 30 + faker.number.int({ min: 0, max: 28 }));
      const createdAt = new Date(closedAt.getTime() - faker.number.int({ min: 14, max: 75 }) * DAY);
      const stage = won ? wonStage : lostStage;
      dealRows.push({
        orgId: org.id,
        title: `${companyList.find((c) => c.id === contact.companyId)?.name ?? "Account"} — ${pick(DEAL_PRODUCTS)}`,
        value: faker.number.int({ min: 6, max: 90 }) * 500,
        stageId: stage.id,
        position: nextPosition(stage.id),
        priority: pick(["low", "medium", "high"] as const),
        contactId: contact.id,
        companyId: contact.companyId,
        ownerId: pick(ownerPool).id,
        expectedCloseDate: closedAt.toISOString().slice(0, 10),
        closedAt,
        lostReason: won ? null : pick(LOST_REASONS),
        createdAt,
        updatedAt: closedAt,
      });
    }
  }

  // Open pipeline.
  for (let i = 0; i < 46; i++) {
    const contact = pick(contactList);
    const stage = faker.helpers.weightedArrayElement(
      openStages.map((st, idx) => ({ value: st, weight: [5, 4, 3, 2][idx] ?? 1 })),
    );
    const createdAt = ago(faker.number.int({ min: 1, max: 70 }));
    dealRows.push({
      orgId: org.id,
      title: `${companyList.find((c) => c.id === contact.companyId)?.name ?? "Account"} — ${pick(DEAL_PRODUCTS)}`,
      value: faker.number.int({ min: 6, max: 120 }) * 500,
      stageId: stage.id,
      position: nextPosition(stage.id),
      priority: faker.helpers.weightedArrayElement([
        { value: "low" as const, weight: 2 },
        { value: "medium" as const, weight: 3 },
        { value: "high" as const, weight: 2 },
      ]),
      contactId: contact.id,
      companyId: contact.companyId,
      ownerId: pick(ownerPool).id,
      expectedCloseDate: ahead(faker.number.int({ min: -6, max: 75 })).toISOString().slice(0, 10),
      createdAt,
      updatedAt: createdAt,
    });
  }
  const dealList = await db.insert(s.deals).values(dealRows).returning();

  /* Leads -------------------------------------------------------------- */
  const leadRows: (typeof s.leads.$inferInsert)[] = [];
  for (let i = 0; i < 110; i++) {
    const firstName = pick(FIRST_NAMES);
    const lastName = pick(LAST_NAMES);
    const companyName = `${pick(COMPANY_PREFIX)} ${pick(COMPANY_SUFFIX)}`;
    const status = faker.helpers.weightedArrayElement([
      { value: "new" as const, weight: 5 },
      { value: "contacted" as const, weight: 4 },
      { value: "qualified" as const, weight: 3 },
      { value: "unqualified" as const, weight: 2 },
    ]);
    const createdAt = ago(faker.number.int({ min: 0, max: 120 }));
    const baseScore = { new: 20, contacted: 40, qualified: 70, unqualified: 10 }[status];
    leadRows.push({
      orgId: org.id,
      firstName,
      lastName,
      email: `${slugify(firstName)}.${slugify(lastName)}@${slugify(companyName)}.example`,
      phone: faker.phone.number({ style: "international" }),
      companyName,
      jobTitle: pick(JOB_TITLES),
      source: pick(s.leadSourceEnum.enumValues),
      status,
      score: Math.min(100, baseScore + faker.number.int({ min: 0, max: 28 })),
      estimatedValue: faker.number.int({ min: 4, max: 80 }) * 500,
      notes: faker.datatype.boolean({ probability: 0.4 }) ? pick(NOTE_BODIES) : null,
      ownerId: pick(ownerPool).id,
      createdAt,
      updatedAt: createdAt,
    });
  }
  const leadList = await db.insert(s.leads).values(leadRows).returning();

  /* Activities --------------------------------------------------------- */
  const activityRows: (typeof s.activities.$inferInsert)[] = [];
  const subjectFor = (type: s.ActivityType) =>
    pick({ call: CALL_SUBJECTS, meeting: MEETING_SUBJECTS, email: EMAIL_SUBJECTS, task: TASK_SUBJECTS }[type]);

  for (const deal of dealList) {
    const isOpen = !deal.closedAt;
    const count = isOpen ? faker.number.int({ min: 2, max: 5 }) : faker.number.int({ min: 1, max: 3 });
    for (let i = 0; i < count; i++) {
      const type = pick(s.activityTypeEnum.enumValues);
      // Open deals get a mix of overdue, today and upcoming work; closed deals only history.
      const offsetDays = isOpen ? faker.number.int({ min: -20, max: 14 }) : -faker.number.int({ min: 1, max: 300 });
      const dueAt = new Date(now.getTime() + offsetDays * DAY + faker.number.int({ min: -6, max: 6 }) * 3_600_000);
      const done = dueAt < now && faker.datatype.boolean({ probability: isOpen ? 0.7 : 1 });
      activityRows.push({
        orgId: org.id,
        type,
        subject: subjectFor(type),
        description: faker.datatype.boolean({ probability: 0.35 }) ? pick(NOTE_BODIES) : null,
        dueAt,
        completedAt: done ? new Date(dueAt.getTime() + 3_600_000) : null,
        ownerId: deal.ownerId,
        dealId: deal.id,
        contactId: deal.contactId,
        companyId: deal.companyId,
        createdAt: new Date(Math.min(dueAt.getTime(), now.getTime()) - 2 * DAY),
      });
    }
  }
  // A handful of items due today for the demo accounts, so "My day" is never empty.
  for (const owner of team.slice(0, 3)) {
    for (let i = 0; i < 3; i++) {
      const type = pick(s.activityTypeEnum.enumValues);
      const deal = pick(dealList.filter((d) => !d.closedAt));
      const dueAt = new Date(now);
      dueAt.setHours(10 + i * 2 + (i === 2 ? 1 : 0), i * 15, 0, 0);
      activityRows.push({
        orgId: org.id,
        type,
        subject: subjectFor(type),
        dueAt,
        ownerId: owner.id,
        dealId: deal.id,
        contactId: deal.contactId,
        companyId: deal.companyId,
        createdAt: ago(1),
      });
    }
    const overdueDeal = pick(dealList.filter((d) => !d.closedAt));
    activityRows.push({
      orgId: org.id,
      type: "email",
      subject: "Send revised proposal",
      dueAt: ago(2),
      ownerId: owner.id,
      dealId: overdueDeal.id,
      contactId: overdueDeal.contactId,
      companyId: overdueDeal.companyId,
      createdAt: ago(5),
    });
  }
  for (const lead of leadList.slice(0, 30)) {
    activityRows.push({
      orgId: org.id,
      type: "call",
      subject: "Qualification call",
      dueAt: ahead(faker.number.int({ min: -5, max: 10 })),
      ownerId: lead.ownerId,
      leadId: lead.id,
      createdAt: lead.createdAt,
    });
  }
  for (let i = 0; i < activityRows.length; i += 200) {
    await db.insert(s.activities).values(activityRows.slice(i, i + 200));
  }

  /* Notes -------------------------------------------------------------- */
  const noteRows: (typeof s.notes.$inferInsert)[] = [];
  for (const deal of dealList.filter(() => faker.datatype.boolean({ probability: 0.45 }))) {
    noteRows.push({
      orgId: org.id,
      body: pick(NOTE_BODIES),
      authorId: deal.ownerId,
      entityType: "deal",
      entityId: deal.id,
      createdAt: new Date(deal.createdAt.getTime() + 2 * DAY),
    });
  }
  for (const contact of contactList.filter(() => faker.datatype.boolean({ probability: 0.25 }))) {
    noteRows.push({
      orgId: org.id,
      body: pick(NOTE_BODIES),
      authorId: contact.ownerId,
      entityType: "contact",
      entityId: contact.id,
      createdAt: new Date(contact.createdAt.getTime() + DAY),
    });
  }
  if (noteRows.length) await db.insert(s.notes).values(noteRows);

  /* Audit trail -------------------------------------------------------- */
  const recentDeals = [...dealList].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()).slice(0, 24);
  const auditRows: (typeof s.auditLogs.$inferInsert)[] = recentDeals.map((deal, i) => {
    const stage = stages.find((st) => st.id === deal.stageId)!;
    const action = stage.kind === "won" ? "deal.won" : stage.kind === "lost" ? "deal.lost" : i % 2 ? "deal.stage_changed" : "deal.created";
    return {
      orgId: org.id,
      actorId: deal.ownerId,
      action,
      entityType: "deal" as const,
      entityId: deal.id,
      entityLabel: deal.title,
      meta: { stage: stage.name, value: deal.value },
      createdAt: new Date(Math.min(deal.updatedAt.getTime(), now.getTime() - i * 3_600_000)),
    };
  });
  for (const lead of leadList.slice(0, 12)) {
    auditRows.push({
      orgId: org.id,
      actorId: lead.ownerId,
      action: "lead.created",
      entityType: "lead",
      entityId: lead.id,
      entityLabel: `${lead.firstName} ${lead.lastName}`,
      meta: { source: lead.source },
      createdAt: lead.createdAt,
    });
  }
  await db.insert(s.auditLogs).values(auditRows);

  return { orgId: org.id };
}
