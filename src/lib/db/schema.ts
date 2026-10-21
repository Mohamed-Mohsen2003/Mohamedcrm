import { relations, sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ */
/* Enums                                                               */
/* ------------------------------------------------------------------ */

export const roleEnum = pgEnum("role", ["admin", "manager", "rep"]);
export const leadStatusEnum = pgEnum("lead_status", [
  "new",
  "contacted",
  "qualified",
  "unqualified",
  "converted",
]);
export const leadSourceEnum = pgEnum("lead_source", [
  "website",
  "referral",
  "linkedin",
  "cold_call",
  "event",
  "ads",
  "partner",
]);
export const lifecycleEnum = pgEnum("lifecycle", [
  "lead",
  "opportunity",
  "customer",
  "churned",
]);
export const stageKindEnum = pgEnum("stage_kind", ["open", "won", "lost"]);
export const priorityEnum = pgEnum("priority", ["low", "medium", "high"]);
export const activityTypeEnum = pgEnum("activity_type", [
  "call",
  "email",
  "meeting",
  "task",
]);
export const entityTypeEnum = pgEnum("entity_type", [
  "lead",
  "contact",
  "company",
  "deal",
  "activity",
  "user",
  "stage",
]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

/* ------------------------------------------------------------------ */
/* Tenancy & people                                                    */
/* ------------------------------------------------------------------ */

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  currency: text("currency").notNull().default("USD"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: roleEnum("role").notNull().default("rep"),
    title: text("title"),
    avatarHue: integer("avatar_hue").notNull().default(160),
    isActive: boolean("is_active").notNull().default(true),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email), index("users_org_idx").on(t.orgId)],
);

/* ------------------------------------------------------------------ */
/* CRM core                                                            */
/* ------------------------------------------------------------------ */

export const companies = pgTable(
  "companies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    domain: text("domain"),
    industry: text("industry"),
    size: text("size"),
    country: text("country"),
    city: text("city"),
    phone: text("phone"),
    annualRevenue: integer("annual_revenue"),
    ownerId: uuid("owner_id").references(() => users.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [index("companies_org_idx").on(t.orgId), index("companies_name_idx").on(t.name)],
);

export const contacts = pgTable(
  "contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email"),
    phone: text("phone"),
    jobTitle: text("job_title"),
    lifecycle: lifecycleEnum("lifecycle").notNull().default("lead"),
    tags: text("tags")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    ownerId: uuid("owner_id").references(() => users.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [
    index("contacts_org_idx").on(t.orgId),
    index("contacts_company_idx").on(t.companyId),
  ],
);

export const leads = pgTable(
  "leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email"),
    phone: text("phone"),
    companyName: text("company_name"),
    jobTitle: text("job_title"),
    source: leadSourceEnum("source").notNull().default("website"),
    status: leadStatusEnum("status").notNull().default("new"),
    score: integer("score").notNull().default(0),
    estimatedValue: integer("estimated_value").notNull().default(0),
    notes: text("notes"),
    ownerId: uuid("owner_id").references(() => users.id, { onDelete: "set null" }),
    convertedContactId: uuid("converted_contact_id").references(() => contacts.id, {
      onDelete: "set null",
    }),
    convertedDealId: uuid("converted_deal_id"),
    convertedAt: timestamp("converted_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("leads_org_idx").on(t.orgId), index("leads_status_idx").on(t.status)],
);

export const pipelineStages = pgTable(
  "pipeline_stages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    position: integer("position").notNull(),
    probability: integer("probability").notNull().default(10),
    kind: stageKindEnum("kind").notNull().default("open"),
    color: text("color").notNull().default("jade"),
  },
  (t) => [index("stages_org_idx").on(t.orgId)],
);

export const deals = pgTable(
  "deals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    value: integer("value").notNull().default(0),
    stageId: uuid("stage_id")
      .notNull()
      .references(() => pipelineStages.id, { onDelete: "restrict" }),
    position: integer("position").notNull().default(0),
    priority: priorityEnum("priority").notNull().default("medium"),
    contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "set null" }),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
    ownerId: uuid("owner_id").references(() => users.id, { onDelete: "set null" }),
    expectedCloseDate: date("expected_close_date", { mode: "string" }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    lostReason: text("lost_reason"),
    ...timestamps,
  },
  (t) => [
    index("deals_org_idx").on(t.orgId),
    index("deals_stage_idx").on(t.stageId),
    index("deals_owner_idx").on(t.ownerId),
  ],
);

export const activities = pgTable(
  "activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    type: activityTypeEnum("type").notNull(),
    subject: text("subject").notNull(),
    description: text("description"),
    dueAt: timestamp("due_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    ownerId: uuid("owner_id").references(() => users.id, { onDelete: "set null" }),
    dealId: uuid("deal_id").references(() => deals.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "cascade" }),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }),
    leadId: uuid("lead_id").references(() => leads.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (t) => [
    index("activities_org_idx").on(t.orgId),
    index("activities_due_idx").on(t.dueAt),
    index("activities_owner_idx").on(t.ownerId),
  ],
);

export const notes = pgTable(
  "notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
    entityType: entityTypeEnum("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("notes_entity_idx").on(t.entityType, t.entityId)],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    entityType: entityTypeEnum("entity_type").notNull(),
    entityId: uuid("entity_id"),
    entityLabel: text("entity_label"),
    meta: jsonb("meta").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_org_created_idx").on(t.orgId, t.createdAt)],
);

/* ------------------------------------------------------------------ */
/* Relations                                                           */
/* ------------------------------------------------------------------ */

export const usersRelations = relations(users, ({ one }) => ({
  org: one(organizations, { fields: [users.orgId], references: [organizations.id] }),
}));

export const companiesRelations = relations(companies, ({ one, many }) => ({
  owner: one(users, { fields: [companies.ownerId], references: [users.id] }),
  contacts: many(contacts),
  deals: many(deals),
}));

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  company: one(companies, { fields: [contacts.companyId], references: [companies.id] }),
  owner: one(users, { fields: [contacts.ownerId], references: [users.id] }),
  deals: many(deals),
}));

export const leadsRelations = relations(leads, ({ one }) => ({
  owner: one(users, { fields: [leads.ownerId], references: [users.id] }),
}));

export const stagesRelations = relations(pipelineStages, ({ many }) => ({
  deals: many(deals),
}));

export const dealsRelations = relations(deals, ({ one, many }) => ({
  stage: one(pipelineStages, { fields: [deals.stageId], references: [pipelineStages.id] }),
  contact: one(contacts, { fields: [deals.contactId], references: [contacts.id] }),
  company: one(companies, { fields: [deals.companyId], references: [companies.id] }),
  owner: one(users, { fields: [deals.ownerId], references: [users.id] }),
  activities: many(activities),
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
  owner: one(users, { fields: [activities.ownerId], references: [users.id] }),
  deal: one(deals, { fields: [activities.dealId], references: [deals.id] }),
  contact: one(contacts, { fields: [activities.contactId], references: [contacts.id] }),
  company: one(companies, { fields: [activities.companyId], references: [companies.id] }),
  lead: one(leads, { fields: [activities.leadId], references: [leads.id] }),
}));

export const auditRelations = relations(auditLogs, ({ one }) => ({
  actor: one(users, { fields: [auditLogs.actorId], references: [users.id] }),
}));

export type Role = (typeof roleEnum.enumValues)[number];
export type LeadStatus = (typeof leadStatusEnum.enumValues)[number];
export type LeadSource = (typeof leadSourceEnum.enumValues)[number];
export type Lifecycle = (typeof lifecycleEnum.enumValues)[number];
export type StageKind = (typeof stageKindEnum.enumValues)[number];
export type Priority = (typeof priorityEnum.enumValues)[number];
export type ActivityType = (typeof activityTypeEnum.enumValues)[number];
export type EntityType = (typeof entityTypeEnum.enumValues)[number];

export type User = typeof users.$inferSelect;
export type Company = typeof companies.$inferSelect;
export type Contact = typeof contacts.$inferSelect;
export type Lead = typeof leads.$inferSelect;
export type Stage = typeof pipelineStages.$inferSelect;
export type Deal = typeof deals.$inferSelect;
export type Activity = typeof activities.$inferSelect;
export type Note = typeof notes.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
