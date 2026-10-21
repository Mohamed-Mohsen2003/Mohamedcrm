import { z } from "zod";
import {
  activityTypeEnum,
  leadSourceEnum,
  leadStatusEnum,
  lifecycleEnum,
  priorityEnum,
  roleEnum,
} from "@/lib/db/schema";

/** Turns empty form strings into `undefined` so optional fields behave. */
const blank = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);
const optionalText = (max = 200) => z.preprocess(blank, z.string().trim().max(max).optional());
/** Trims and lowercases before validating, so pasted addresses with stray spaces pass. */
const email = () => z.string({ error: "required" }).trim().toLowerCase().pipe(z.email({ error: "invalid_email" }).max(160));
const optionalEmail = z.preprocess(blank, email().optional());
const optionalPhone = z.preprocess(
  blank,
  z
    .string()
    .trim()
    .regex(/^[+()\d\s.-]{6,24}$/, { error: "invalid_phone" })
    .optional(),
);
const optionalUuid = z.preprocess(blank, z.uuid().optional());
const money = z.preprocess(
  (v) => (blank(v) === undefined ? 0 : Number(String(v).replace(/[^\d.-]/g, ""))),
  z.number({ error: "invalid_number" }).int().min(0, { error: "min_zero" }).max(1_000_000_000),
);
const requiredText = (max = 120) => z.string({ error: "required" }).trim().min(1, { error: "required" }).max(max);

export const loginSchema = z.object({
  email: email(),
  password: z.string().min(1, { error: "required" }).max(200),
});

export const leadSchema = z.object({
  firstName: requiredText(80),
  lastName: requiredText(80),
  email: optionalEmail,
  phone: optionalPhone,
  companyName: optionalText(120),
  jobTitle: optionalText(120),
  source: z.enum(leadSourceEnum.enumValues),
  status: z.enum(leadStatusEnum.enumValues).exclude(["converted"]),
  score: z.coerce.number().int().min(0).max(100),
  estimatedValue: money,
  ownerId: optionalUuid,
  notes: optionalText(2000),
});

export const convertLeadSchema = z.object({
  createDeal: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()),
  dealTitle: optionalText(160),
  dealValue: money,
  stageId: optionalUuid,
});

export const contactSchema = z.object({
  firstName: requiredText(80),
  lastName: requiredText(80),
  email: optionalEmail,
  phone: optionalPhone,
  jobTitle: optionalText(120),
  companyId: optionalUuid,
  lifecycle: z.enum(lifecycleEnum.enumValues),
  tags: z.preprocess(
    (v) =>
      typeof v === "string"
        ? v
            .split(",")
            .map((t) => t.trim().toLowerCase())
            .filter(Boolean)
        : v,
    z.array(z.string().max(32)).max(10).default([]),
  ),
  ownerId: optionalUuid,
});

export const companySchema = z.object({
  name: requiredText(120),
  domain: z.preprocess(
    blank,
    z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)+$/, { error: "invalid_domain" })
      .optional(),
  ),
  industry: optionalText(80),
  size: optionalText(20),
  country: optionalText(80),
  city: optionalText(80),
  phone: optionalPhone,
  annualRevenue: money,
  ownerId: optionalUuid,
});

export const dealSchema = z.object({
  title: requiredText(160),
  value: money,
  stageId: z.uuid({ error: "required" }),
  priority: z.enum(priorityEnum.enumValues),
  contactId: optionalUuid,
  companyId: optionalUuid,
  ownerId: optionalUuid,
  expectedCloseDate: z.preprocess(blank, z.iso.date({ error: "invalid_date" }).optional()),
});

export const moveDealSchema = z.object({
  dealId: z.uuid(),
  stageId: z.uuid(),
  index: z.number().int().min(0),
  lostReason: z.string().trim().max(200).optional(),
});

export const activitySchema = z.object({
  type: z.enum(activityTypeEnum.enumValues),
  subject: requiredText(160),
  description: optionalText(2000),
  dueAt: z.preprocess(blank, z.iso.datetime({ offset: true, error: "invalid_date" }).optional()),
  ownerId: optionalUuid,
  dealId: optionalUuid,
  contactId: optionalUuid,
  companyId: optionalUuid,
  leadId: optionalUuid,
});

export const noteSchema = z.object({
  body: requiredText(4000),
  entityType: z.enum(["lead", "contact", "company", "deal"]),
  entityId: z.uuid(),
});

export const teamMemberSchema = z.object({
  name: requiredText(80),
  email: email(),
  title: optionalText(80),
  role: z.enum(roleEnum.enumValues),
});

export const stageSchema = z.object({
  id: optionalUuid,
  name: requiredText(40),
  probability: z.coerce.number().int().min(0).max(100),
  color: z.enum(["jade", "saffron", "coral", "iris", "sky", "rose", "slate"]),
});

export const listQuerySchema = z.object({
  q: z.string().trim().max(100).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(10_000).catch(1),
  perPage: z.coerce.number().int().min(5).max(100).catch(20),
  sort: z.string().max(40).optional().catch(undefined),
  dir: z.enum(["asc", "desc"]).catch("desc"),
  owner: z.string().max(40).optional().catch(undefined),
  status: z.string().max(40).optional().catch(undefined),
  source: z.string().max(40).optional().catch(undefined),
});

export type ListQuery = z.infer<typeof listQuerySchema>;
export type LeadInput = z.infer<typeof leadSchema>;
export type ContactInput = z.infer<typeof contactSchema>;
export type CompanyInput = z.infer<typeof companySchema>;
export type DealInput = z.infer<typeof dealSchema>;
export type ActivityInput = z.infer<typeof activitySchema>;
