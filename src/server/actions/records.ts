"use server";

import { and, asc, eq, gt, gte, inArray, lt, ne, sql } from "drizzle-orm";
import { getDb, type Database } from "@/lib/db";
import { activities, companies, contacts, deals, leads, notes, pipelineStages, users } from "@/lib/db/schema";
import { can, canModify } from "@/lib/auth/permissions";
import type { CurrentUser } from "@/lib/auth/session";
import {
  activitySchema,
  companySchema,
  contactSchema,
  convertLeadSchema,
  dealSchema,
  leadSchema,
  moveDealSchema,
  noteSchema,
} from "@/lib/validation/schemas";
import { fail, ok } from "@/lib/validation/result";
import { recordAudit } from "@/server/audit";
import { ActionError, guarded, parseForm } from "./_wrap";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

async function assertOwnerInOrg(db: Database, orgId: string, ownerId: string | undefined) {
  if (!ownerId) return;
  const [row] = await db.select({ id: users.id }).from(users).where(and(eq(users.id, ownerId), eq(users.orgId, orgId))).limit(1);
  if (!row) throw new ActionError("invalid_owner");
}

async function assertRefsInOrg(db: Database, orgId: string, refs: { companyId?: string; contactId?: string; dealId?: string; leadId?: string; stageId?: string }) {
  const checks: Array<Promise<unknown[]>> = [];
  if (refs.companyId) checks.push(db.select({ id: companies.id }).from(companies).where(and(eq(companies.id, refs.companyId), eq(companies.orgId, orgId))));
  if (refs.contactId) checks.push(db.select({ id: contacts.id }).from(contacts).where(and(eq(contacts.id, refs.contactId), eq(contacts.orgId, orgId))));
  if (refs.dealId) checks.push(db.select({ id: deals.id }).from(deals).where(and(eq(deals.id, refs.dealId), eq(deals.orgId, orgId))));
  if (refs.leadId) checks.push(db.select({ id: leads.id }).from(leads).where(and(eq(leads.id, refs.leadId), eq(leads.orgId, orgId))));
  if (refs.stageId) checks.push(db.select({ id: pipelineStages.id }).from(pipelineStages).where(and(eq(pipelineStages.id, refs.stageId), eq(pipelineStages.orgId, orgId))));
  const results = await Promise.all(checks);
  if (results.some((r) => r.length === 0)) throw new ActionError("not_found");
}

/** Reps may only assign records to themselves. */
function resolveOwner(actor: CurrentUser, requested: string | undefined) {
  if (!requested) return actor.id;
  if (requested !== actor.id && !can(actor.role, "records:reassign")) throw new ActionError("forbidden");
  return requested;
}

/* ------------------------------------------------------------------ */
/* Leads                                                               */
/* ------------------------------------------------------------------ */

export async function saveLeadAction(id: string | null, formData: FormData) {
  return guarded("records:create", async (actor) => {
    const parsed = parseForm(leadSchema, formData);
    if ("error" in parsed) return parsed.error;
    const input = parsed.data;
    const db = await getDb();
    const ownerId = resolveOwner(actor, input.ownerId);
    await assertOwnerInOrg(db, actor.orgId, ownerId);
    const values = {
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email ?? null,
      phone: input.phone ?? null,
      companyName: input.companyName ?? null,
      jobTitle: input.jobTitle ?? null,
      source: input.source,
      status: input.status,
      score: input.score,
      estimatedValue: input.estimatedValue,
      notes: input.notes ?? null,
      ownerId,
    };
    const label = `${input.firstName} ${input.lastName}`;

    if (id) {
      const [existing] = await db.select().from(leads).where(and(eq(leads.id, id), eq(leads.orgId, actor.orgId))).limit(1);
      if (!existing) return fail("not_found");
      if (!canModify(actor, existing.ownerId)) return fail("forbidden");
      if (existing.status === "converted") return fail("lead_converted");
      if (existing.ownerId !== ownerId && !can(actor.role, "records:reassign")) return fail("forbidden");
      await db.update(leads).set(values).where(eq(leads.id, id));
      await recordAudit(db, { orgId: actor.orgId, actorId: actor.id, action: "lead.updated", entityType: "lead", entityId: id, entityLabel: label });
      return ok({ id }, "lead_saved");
    }

    const [created] = await db.insert(leads).values({ ...values, orgId: actor.orgId }).returning({ id: leads.id });
    await recordAudit(db, { orgId: actor.orgId, actorId: actor.id, action: "lead.created", entityType: "lead", entityId: created!.id, entityLabel: label, meta: { source: input.source } });
    return ok({ id: created!.id }, "lead_created");
  });
}

export async function deleteLeadsAction(ids: string[]) {
  return guarded("records:delete:own", async (actor) => {
    if (!Array.isArray(ids) || ids.length === 0 || ids.length > 200) return fail("validation");
    const db = await getDb();
    const rows = await db.select({ id: leads.id, ownerId: leads.ownerId, firstName: leads.firstName, lastName: leads.lastName }).from(leads).where(and(eq(leads.orgId, actor.orgId), inArray(leads.id, ids)));
    if (rows.length !== ids.length) return fail("not_found");
    if (rows.some((r) => !canModify(actor, r.ownerId, "delete"))) return fail("forbidden");
    await db.delete(leads).where(and(eq(leads.orgId, actor.orgId), inArray(leads.id, ids)));
    await recordAudit(db, {
      orgId: actor.orgId,
      actorId: actor.id,
      action: "lead.deleted",
      entityType: "lead",
      entityLabel: rows.length === 1 ? `${rows[0]!.firstName} ${rows[0]!.lastName}` : `${rows.length} leads`,
      meta: { count: rows.length },
    });
    return ok({ count: rows.length }, "leads_deleted");
  });
}

export async function assignLeadsAction(ids: string[], ownerId: string) {
  return guarded("records:reassign", async (actor) => {
    if (!Array.isArray(ids) || ids.length === 0 || ids.length > 200) return fail("validation");
    const db = await getDb();
    await assertOwnerInOrg(db, actor.orgId, ownerId);
    const updated = await db.update(leads).set({ ownerId }).where(and(eq(leads.orgId, actor.orgId), inArray(leads.id, ids))).returning({ id: leads.id });
    await recordAudit(db, { orgId: actor.orgId, actorId: actor.id, action: "lead.reassigned", entityType: "lead", entityLabel: `${updated.length} leads`, meta: { ownerId } });
    return ok({ count: updated.length }, "leads_assigned");
  });
}

export async function setLeadStatusAction(ids: string[], status: "new" | "contacted" | "qualified" | "unqualified") {
  return guarded("records:update:own", async (actor) => {
    if (!["new", "contacted", "qualified", "unqualified"].includes(status) || !ids.length || ids.length > 200) return fail("validation");
    const db = await getDb();
    const rows = await db.select({ id: leads.id, ownerId: leads.ownerId, status: leads.status }).from(leads).where(and(eq(leads.orgId, actor.orgId), inArray(leads.id, ids)));
    if (rows.some((r) => !canModify(actor, r.ownerId))) return fail("forbidden");
    const editable = rows.filter((r) => r.status !== "converted").map((r) => r.id);
    if (editable.length) await db.update(leads).set({ status }).where(inArray(leads.id, editable));
    await recordAudit(db, { orgId: actor.orgId, actorId: actor.id, action: "lead.status_changed", entityType: "lead", entityLabel: `${editable.length} leads`, meta: { status } });
    return ok({ count: editable.length }, "leads_updated");
  });
}

export async function convertLeadAction(id: string, formData: FormData) {
  return guarded("records:create", async (actor) => {
    const parsed = parseForm(convertLeadSchema, formData);
    if ("error" in parsed) return parsed.error;
    const input = parsed.data;
    const db = await getDb();
    const [lead] = await db.select().from(leads).where(and(eq(leads.id, id), eq(leads.orgId, actor.orgId))).limit(1);
    if (!lead) return fail("not_found");
    if (lead.status === "converted") return fail("lead_converted");
    if (!canModify(actor, lead.ownerId)) return fail("forbidden");

    const result = await db.transaction(async (tx) => {
      let companyId: string | null = null;
      if (lead.companyName) {
        const [existing] = await tx
          .select({ id: companies.id })
          .from(companies)
          .where(and(eq(companies.orgId, actor.orgId), sql`lower(${companies.name}) = lower(${lead.companyName})`))
          .limit(1);
        companyId =
          existing?.id ??
          (await tx.insert(companies).values({ orgId: actor.orgId, name: lead.companyName, ownerId: lead.ownerId }).returning({ id: companies.id }))[0]!.id;
      }
      const [contact] = await tx
        .insert(contacts)
        .values({
          orgId: actor.orgId,
          companyId,
          firstName: lead.firstName,
          lastName: lead.lastName,
          email: lead.email,
          phone: lead.phone,
          jobTitle: lead.jobTitle,
          lifecycle: input.createDeal ? "opportunity" : "lead",
          ownerId: lead.ownerId,
        })
        .returning({ id: contacts.id });

      let dealId: string | null = null;
      if (input.createDeal) {
        const stage = input.stageId
          ? (await tx.select().from(pipelineStages).where(and(eq(pipelineStages.id, input.stageId), eq(pipelineStages.orgId, actor.orgId))))[0]
          : (await tx.select().from(pipelineStages).where(and(eq(pipelineStages.orgId, actor.orgId), eq(pipelineStages.kind, "open"))).orderBy(asc(pipelineStages.position)).limit(1))[0];
        if (!stage || stage.kind !== "open") throw new ActionError("invalid_stage");
        await tx.update(deals).set({ position: sql`${deals.position} + 1` }).where(eq(deals.stageId, stage.id));
        const [deal] = await tx
          .insert(deals)
          .values({
            orgId: actor.orgId,
            title: input.dealTitle || `${lead.companyName ?? `${lead.firstName} ${lead.lastName}`} — New opportunity`,
            value: input.dealValue || lead.estimatedValue,
            stageId: stage.id,
            position: 0,
            contactId: contact!.id,
            companyId,
            ownerId: lead.ownerId,
          })
          .returning({ id: deals.id });
        dealId = deal!.id;
      }
      await tx
        .update(leads)
        .set({ status: "converted", convertedAt: new Date(), convertedContactId: contact!.id, convertedDealId: dealId })
        .where(eq(leads.id, id));
      await tx.update(activities).set({ contactId: contact!.id, companyId, dealId }).where(eq(activities.leadId, id));
      return { contactId: contact!.id, dealId, companyId };
    });

    await recordAudit(db, {
      orgId: actor.orgId,
      actorId: actor.id,
      action: "lead.converted",
      entityType: "lead",
      entityId: id,
      entityLabel: `${lead.firstName} ${lead.lastName}`,
      meta: result,
    });
    return ok(result, "lead_converted_ok");
  });
}

/* ------------------------------------------------------------------ */
/* Contacts                                                            */
/* ------------------------------------------------------------------ */

export async function saveContactAction(id: string | null, formData: FormData) {
  return guarded("records:create", async (actor) => {
    const parsed = parseForm(contactSchema, formData);
    if ("error" in parsed) return parsed.error;
    const input = parsed.data;
    const db = await getDb();
    const ownerId = resolveOwner(actor, input.ownerId);
    await Promise.all([assertOwnerInOrg(db, actor.orgId, ownerId), assertRefsInOrg(db, actor.orgId, { companyId: input.companyId })]);
    const values = {
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email ?? null,
      phone: input.phone ?? null,
      jobTitle: input.jobTitle ?? null,
      companyId: input.companyId ?? null,
      lifecycle: input.lifecycle,
      tags: input.tags,
      ownerId,
    };
    const label = `${input.firstName} ${input.lastName}`;
    if (id) {
      const [existing] = await db.select({ ownerId: contacts.ownerId }).from(contacts).where(and(eq(contacts.id, id), eq(contacts.orgId, actor.orgId))).limit(1);
      if (!existing) return fail("not_found");
      if (!canModify(actor, existing.ownerId)) return fail("forbidden");
      if (existing.ownerId !== ownerId && !can(actor.role, "records:reassign")) return fail("forbidden");
      await db.update(contacts).set(values).where(eq(contacts.id, id));
      await recordAudit(db, { orgId: actor.orgId, actorId: actor.id, action: "contact.updated", entityType: "contact", entityId: id, entityLabel: label });
      return ok({ id }, "contact_saved");
    }
    const [created] = await db.insert(contacts).values({ ...values, orgId: actor.orgId }).returning({ id: contacts.id });
    await recordAudit(db, { orgId: actor.orgId, actorId: actor.id, action: "contact.created", entityType: "contact", entityId: created!.id, entityLabel: label });
    return ok({ id: created!.id }, "contact_created");
  });
}

export async function deleteContactAction(id: string) {
  return guarded("records:delete:own", async (actor) => {
    const db = await getDb();
    const [existing] = await db.select().from(contacts).where(and(eq(contacts.id, id), eq(contacts.orgId, actor.orgId))).limit(1);
    if (!existing) return fail("not_found");
    if (!canModify(actor, existing.ownerId, "delete")) return fail("forbidden");
    await db.delete(contacts).where(eq(contacts.id, id));
    await db.delete(notes).where(and(eq(notes.entityType, "contact"), eq(notes.entityId, id)));
    await recordAudit(db, { orgId: actor.orgId, actorId: actor.id, action: "contact.deleted", entityType: "contact", entityId: id, entityLabel: `${existing.firstName} ${existing.lastName}` });
    return ok({ id }, "contact_deleted");
  });
}

/* ------------------------------------------------------------------ */
/* Companies                                                           */
/* ------------------------------------------------------------------ */

export async function saveCompanyAction(id: string | null, formData: FormData) {
  return guarded("records:create", async (actor) => {
    const parsed = parseForm(companySchema, formData);
    if ("error" in parsed) return parsed.error;
    const input = parsed.data;
    const db = await getDb();
    const ownerId = resolveOwner(actor, input.ownerId);
    await assertOwnerInOrg(db, actor.orgId, ownerId);
    const [dupe] = await db
      .select({ id: companies.id })
      .from(companies)
      .where(and(eq(companies.orgId, actor.orgId), sql`lower(${companies.name}) = lower(${input.name})`, id ? ne(companies.id, id) : undefined))
      .limit(1);
    if (dupe) return fail("validation", { name: "duplicate_company" });
    const values = {
      name: input.name,
      domain: input.domain ?? null,
      industry: input.industry ?? null,
      size: input.size ?? null,
      country: input.country ?? null,
      city: input.city ?? null,
      phone: input.phone ?? null,
      annualRevenue: input.annualRevenue || null,
      ownerId,
    };
    if (id) {
      const [existing] = await db.select({ ownerId: companies.ownerId }).from(companies).where(and(eq(companies.id, id), eq(companies.orgId, actor.orgId))).limit(1);
      if (!existing) return fail("not_found");
      if (!canModify(actor, existing.ownerId)) return fail("forbidden");
      if (existing.ownerId !== ownerId && !can(actor.role, "records:reassign")) return fail("forbidden");
      await db.update(companies).set(values).where(eq(companies.id, id));
      await recordAudit(db, { orgId: actor.orgId, actorId: actor.id, action: "company.updated", entityType: "company", entityId: id, entityLabel: input.name });
      return ok({ id }, "company_saved");
    }
    const [created] = await db.insert(companies).values({ ...values, orgId: actor.orgId }).returning({ id: companies.id });
    await recordAudit(db, { orgId: actor.orgId, actorId: actor.id, action: "company.created", entityType: "company", entityId: created!.id, entityLabel: input.name });
    return ok({ id: created!.id }, "company_created");
  });
}

export async function deleteCompanyAction(id: string) {
  return guarded("records:delete:any", async (actor) => {
    const db = await getDb();
    const [existing] = await db.select().from(companies).where(and(eq(companies.id, id), eq(companies.orgId, actor.orgId))).limit(1);
    if (!existing) return fail("not_found");
    await db.delete(companies).where(eq(companies.id, id));
    await db.delete(notes).where(and(eq(notes.entityType, "company"), eq(notes.entityId, id)));
    await recordAudit(db, { orgId: actor.orgId, actorId: actor.id, action: "company.deleted", entityType: "company", entityId: id, entityLabel: existing.name });
    return ok({ id }, "company_deleted");
  });
}

/* ------------------------------------------------------------------ */
/* Deals                                                               */
/* ------------------------------------------------------------------ */

export async function saveDealAction(id: string | null, formData: FormData) {
  return guarded("records:create", async (actor) => {
    const parsed = parseForm(dealSchema, formData);
    if ("error" in parsed) return parsed.error;
    const input = parsed.data;
    const db = await getDb();
    const ownerId = resolveOwner(actor, input.ownerId);
    await Promise.all([
      assertOwnerInOrg(db, actor.orgId, ownerId),
      assertRefsInOrg(db, actor.orgId, { companyId: input.companyId, contactId: input.contactId, stageId: input.stageId }),
    ]);
    const [stage] = await db.select().from(pipelineStages).where(eq(pipelineStages.id, input.stageId)).limit(1);
    const values = {
      title: input.title,
      value: input.value,
      priority: input.priority,
      contactId: input.contactId ?? null,
      companyId: input.companyId ?? null,
      ownerId,
      expectedCloseDate: input.expectedCloseDate ?? null,
    };

    if (id) {
      const [existing] = await db.select().from(deals).where(and(eq(deals.id, id), eq(deals.orgId, actor.orgId))).limit(1);
      if (!existing) return fail("not_found");
      if (!canModify(actor, existing.ownerId)) return fail("forbidden");
      if (existing.ownerId !== ownerId && !can(actor.role, "records:reassign")) return fail("forbidden");
      const stageChanged = existing.stageId !== input.stageId;
      await db
        .update(deals)
        .set({
          ...values,
          stageId: input.stageId,
          ...(stageChanged ? { position: 0, closedAt: stage!.kind === "open" ? null : new Date(), lostReason: stage!.kind === "lost" ? existing.lostReason : null } : {}),
        })
        .where(eq(deals.id, id));
      await recordAudit(db, {
        orgId: actor.orgId,
        actorId: actor.id,
        action: stageChanged ? (stage!.kind === "won" ? "deal.won" : stage!.kind === "lost" ? "deal.lost" : "deal.stage_changed") : "deal.updated",
        entityType: "deal",
        entityId: id,
        entityLabel: input.title,
        meta: { stage: stage!.name, value: input.value },
      });
      return ok({ id }, "deal_saved");
    }

    await db.update(deals).set({ position: sql`${deals.position} + 1` }).where(eq(deals.stageId, input.stageId));
    const [created] = await db
      .insert(deals)
      .values({ ...values, orgId: actor.orgId, stageId: input.stageId, position: 0, closedAt: stage!.kind === "open" ? null : new Date() })
      .returning({ id: deals.id });
    await recordAudit(db, { orgId: actor.orgId, actorId: actor.id, action: "deal.created", entityType: "deal", entityId: created!.id, entityLabel: input.title, meta: { stage: stage!.name, value: input.value } });
    return ok({ id: created!.id }, "deal_created");
  });
}

/** Moves a deal to `stageId` at `index`, re-packing positions in both columns. */
export async function moveDealAction(payload: { dealId: string; stageId: string; index: number; lostReason?: string }) {
  return guarded("records:update:own", async (actor) => {
    const parsed = moveDealSchema.safeParse(payload);
    if (!parsed.success) return fail("validation");
    const { dealId, stageId, index, lostReason } = parsed.data;
    const db = await getDb();
    const [deal] = await db.select().from(deals).where(and(eq(deals.id, dealId), eq(deals.orgId, actor.orgId))).limit(1);
    if (!deal) return fail("not_found");
    if (!canModify(actor, deal.ownerId)) return fail("forbidden");
    const [stage] = await db.select().from(pipelineStages).where(and(eq(pipelineStages.id, stageId), eq(pipelineStages.orgId, actor.orgId))).limit(1);
    if (!stage) return fail("not_found");

    await db.transaction(async (tx) => {
      const sameStage = deal.stageId === stageId;
      if (sameStage) {
        if (index > deal.position) {
          await tx.update(deals).set({ position: sql`${deals.position} - 1` }).where(and(eq(deals.stageId, stageId), gt(deals.position, deal.position), sql`${deals.position} <= ${index}`));
        } else if (index < deal.position) {
          await tx.update(deals).set({ position: sql`${deals.position} + 1` }).where(and(eq(deals.stageId, stageId), gte(deals.position, index), lt(deals.position, deal.position)));
        }
      } else {
        await tx.update(deals).set({ position: sql`${deals.position} - 1` }).where(and(eq(deals.stageId, deal.stageId), gt(deals.position, deal.position)));
        await tx.update(deals).set({ position: sql`${deals.position} + 1` }).where(and(eq(deals.stageId, stageId), gte(deals.position, index)));
      }
      await tx
        .update(deals)
        .set({
          stageId,
          position: index,
          ...(sameStage
            ? {}
            : {
                closedAt: stage.kind === "open" ? null : new Date(),
                lostReason: stage.kind === "lost" ? (lostReason ?? deal.lostReason ?? null) : null,
              }),
        })
        .where(eq(deals.id, dealId));
      if (!sameStage && stage.kind === "won" && deal.contactId) {
        await tx.update(contacts).set({ lifecycle: "customer" }).where(eq(contacts.id, deal.contactId));
      }
    });

    if (deal.stageId !== stageId) {
      await recordAudit(db, {
        orgId: actor.orgId,
        actorId: actor.id,
        action: stage.kind === "won" ? "deal.won" : stage.kind === "lost" ? "deal.lost" : "deal.stage_changed",
        entityType: "deal",
        entityId: dealId,
        entityLabel: deal.title,
        meta: { stage: stage.name, value: deal.value, ...(lostReason ? { reason: lostReason } : {}) },
      });
    }
    return ok({ id: dealId, kind: stage.kind });
  });
}

export async function deleteDealAction(id: string) {
  return guarded("records:delete:own", async (actor) => {
    const db = await getDb();
    const [existing] = await db.select().from(deals).where(and(eq(deals.id, id), eq(deals.orgId, actor.orgId))).limit(1);
    if (!existing) return fail("not_found");
    if (!canModify(actor, existing.ownerId, "delete")) return fail("forbidden");
    await db.transaction(async (tx) => {
      await tx.delete(deals).where(eq(deals.id, id));
      await tx.update(deals).set({ position: sql`${deals.position} - 1` }).where(and(eq(deals.stageId, existing.stageId), gt(deals.position, existing.position)));
      await tx.delete(notes).where(and(eq(notes.entityType, "deal"), eq(notes.entityId, id)));
    });
    await recordAudit(db, { orgId: actor.orgId, actorId: actor.id, action: "deal.deleted", entityType: "deal", entityId: id, entityLabel: existing.title, meta: { value: existing.value } });
    return ok({ id }, "deal_deleted");
  });
}

/* ------------------------------------------------------------------ */
/* Activities                                                          */
/* ------------------------------------------------------------------ */

export async function saveActivityAction(id: string | null, formData: FormData) {
  return guarded("records:create", async (actor) => {
    const parsed = parseForm(activitySchema, formData);
    if ("error" in parsed) return parsed.error;
    const input = parsed.data;
    const db = await getDb();
    const ownerId = resolveOwner(actor, input.ownerId);
    await Promise.all([
      assertOwnerInOrg(db, actor.orgId, ownerId),
      assertRefsInOrg(db, actor.orgId, { dealId: input.dealId, contactId: input.contactId, companyId: input.companyId, leadId: input.leadId }),
    ]);

    // Fill in the account context from the linked deal so timelines stay connected.
    let contactId = input.contactId ?? null;
    let companyId = input.companyId ?? null;
    if (input.dealId && (!contactId || !companyId)) {
      const [deal] = await db.select({ contactId: deals.contactId, companyId: deals.companyId }).from(deals).where(eq(deals.id, input.dealId)).limit(1);
      contactId ??= deal?.contactId ?? null;
      companyId ??= deal?.companyId ?? null;
    }
    if (contactId && !companyId) {
      const [contact] = await db.select({ companyId: contacts.companyId }).from(contacts).where(eq(contacts.id, contactId)).limit(1);
      companyId = contact?.companyId ?? null;
    }

    const values = {
      type: input.type,
      subject: input.subject,
      description: input.description ?? null,
      dueAt: input.dueAt ? new Date(input.dueAt) : null,
      ownerId,
      dealId: input.dealId ?? null,
      contactId,
      companyId,
      leadId: input.leadId ?? null,
    };
    if (id) {
      const [existing] = await db.select({ ownerId: activities.ownerId }).from(activities).where(and(eq(activities.id, id), eq(activities.orgId, actor.orgId))).limit(1);
      if (!existing) return fail("not_found");
      if (!canModify(actor, existing.ownerId)) return fail("forbidden");
      await db.update(activities).set(values).where(eq(activities.id, id));
      return ok({ id }, "activity_saved");
    }
    const [created] = await db.insert(activities).values({ ...values, orgId: actor.orgId }).returning({ id: activities.id });
    await recordAudit(db, { orgId: actor.orgId, actorId: actor.id, action: "activity.created", entityType: "activity", entityId: created!.id, entityLabel: input.subject, meta: { type: input.type } });
    return ok({ id: created!.id }, "activity_created");
  });
}

export async function toggleActivityAction(id: string, done: boolean) {
  return guarded("records:update:own", async (actor) => {
    const db = await getDb();
    const [existing] = await db.select().from(activities).where(and(eq(activities.id, id), eq(activities.orgId, actor.orgId))).limit(1);
    if (!existing) return fail("not_found");
    if (!canModify(actor, existing.ownerId)) return fail("forbidden");
    await db.update(activities).set({ completedAt: done ? new Date() : null }).where(eq(activities.id, id));
    if (done) {
      await recordAudit(db, { orgId: actor.orgId, actorId: actor.id, action: "activity.completed", entityType: "activity", entityId: id, entityLabel: existing.subject, meta: { type: existing.type } });
    }
    return ok({ id, done });
  });
}

export async function deleteActivityAction(id: string) {
  return guarded("records:delete:own", async (actor) => {
    const db = await getDb();
    const [existing] = await db.select().from(activities).where(and(eq(activities.id, id), eq(activities.orgId, actor.orgId))).limit(1);
    if (!existing) return fail("not_found");
    if (!canModify(actor, existing.ownerId, "delete")) return fail("forbidden");
    await db.delete(activities).where(eq(activities.id, id));
    return ok({ id }, "activity_deleted");
  });
}

/* ------------------------------------------------------------------ */
/* Notes                                                               */
/* ------------------------------------------------------------------ */

export async function addNoteAction(formData: FormData) {
  return guarded("records:create", async (actor) => {
    const parsed = parseForm(noteSchema, formData);
    if ("error" in parsed) return parsed.error;
    const input = parsed.data;
    const db = await getDb();
    const refKey = { lead: "leadId", contact: "contactId", company: "companyId", deal: "dealId" }[input.entityType] as "leadId";
    await assertRefsInOrg(db, actor.orgId, { [refKey]: input.entityId });
    const [created] = await db.insert(notes).values({ orgId: actor.orgId, body: input.body, authorId: actor.id, entityType: input.entityType, entityId: input.entityId }).returning({ id: notes.id });
    return ok({ id: created!.id }, "note_added");
  });
}

export async function deleteNoteAction(id: string) {
  return guarded("records:delete:own", async (actor) => {
    const db = await getDb();
    const [existing] = await db.select().from(notes).where(and(eq(notes.id, id), eq(notes.orgId, actor.orgId))).limit(1);
    if (!existing) return fail("not_found");
    if (!canModify(actor, existing.authorId, "delete")) return fail("forbidden");
    await db.delete(notes).where(eq(notes.id, id));
    return ok({ id }, "note_deleted");
  });
}
