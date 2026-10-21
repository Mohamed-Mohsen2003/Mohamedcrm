"use server";

import bcrypt from "bcryptjs";
import { and, count, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { deals, pipelineStages, users } from "@/lib/db/schema";
import { DEMO_PASSWORD, resetDatabase } from "@/lib/db/seed";
import { destroySession } from "@/lib/auth/session";
import { stageSchema, teamMemberSchema } from "@/lib/validation/schemas";
import { fail, fieldErrorsOf, ok } from "@/lib/validation/result";
import { recordAudit } from "@/server/audit";
import { guarded, parseForm } from "./_wrap";

/* ------------------------------------------------------------------ */
/* Team                                                                */
/* ------------------------------------------------------------------ */

export async function inviteMemberAction(formData: FormData) {
  return guarded("team:manage", async (actor) => {
    const parsed = parseForm(teamMemberSchema, formData);
    if ("error" in parsed) return parsed.error;
    const input = parsed.data;
    const db = await getDb();
    const [exists] = await db.select({ id: users.id }).from(users).where(eq(users.email, input.email)).limit(1);
    if (exists) return fail("validation", { email: "email_taken" });
    const [created] = await db
      .insert(users)
      .values({
        orgId: actor.orgId,
        name: input.name,
        email: input.email,
        title: input.title ?? null,
        role: input.role,
        passwordHash: await bcrypt.hash(DEMO_PASSWORD, 10),
        avatarHue: Math.floor(Math.random() * 360),
      })
      .returning({ id: users.id });
    await recordAudit(db, { orgId: actor.orgId, actorId: actor.id, action: "user.invited", entityType: "user", entityId: created!.id, entityLabel: input.name, meta: { role: input.role } });
    return ok({ id: created!.id }, "member_invited");
  });
}

export async function updateMemberAction(id: string, patch: { role?: "admin" | "manager" | "rep"; isActive?: boolean }) {
  return guarded("team:manage", async (actor) => {
    if (id === actor.id) return fail("cannot_edit_self");
    if (patch.role && !["admin", "manager", "rep"].includes(patch.role)) return fail("validation");
    const db = await getDb();
    const [member] = await db.select().from(users).where(and(eq(users.id, id), eq(users.orgId, actor.orgId))).limit(1);
    if (!member) return fail("not_found");
    // Never leave a workspace without an active admin.
    const demotes = patch.role !== undefined && patch.role !== "admin";
    if (member.role === "admin" && (demotes || patch.isActive === false)) {
      const [{ admins } = { admins: 0 }] = await db
        .select({ admins: count() })
        .from(users)
        .where(and(eq(users.orgId, actor.orgId), eq(users.role, "admin"), eq(users.isActive, true)));
      if (admins <= 1) return fail("last_admin");
    }
    await db
      .update(users)
      .set({ ...(patch.role ? { role: patch.role } : {}), ...(patch.isActive !== undefined ? { isActive: patch.isActive } : {}) })
      .where(eq(users.id, id));
    await recordAudit(db, { orgId: actor.orgId, actorId: actor.id, action: "user.updated", entityType: "user", entityId: id, entityLabel: member.name, meta: patch });
    return ok({ id }, "member_updated");
  });
}

/* ------------------------------------------------------------------ */
/* Pipeline                                                            */
/* ------------------------------------------------------------------ */

export async function saveStagesAction(input: Array<{ id?: string; name: string; probability: number; color: string }>) {
  return guarded("pipeline:manage", async (actor) => {
    if (!Array.isArray(input) || input.length < 1 || input.length > 10) return fail("validation");
    const parsed = input.map((s) => stageSchema.safeParse(s));
    const firstError = parsed.findIndex((p) => !p.success);
    if (firstError >= 0) {
      const err = parsed[firstError]!;
      return fail("validation", err.success ? undefined : Object.fromEntries(Object.entries(fieldErrorsOf(err.error)).map(([k, v]) => [`${firstError}.${k}`, v])));
    }
    const stages = parsed.map((p) => (p.success ? p.data : null)!);
    const db = await getDb();
    const existing = await db.select().from(pipelineStages).where(eq(pipelineStages.orgId, actor.orgId));
    const openExisting = existing.filter((s) => s.kind === "open");
    const keepIds = stages.map((s) => s.id).filter((id): id is string => Boolean(id));
    if (keepIds.some((id) => !openExisting.some((s) => s.id === id))) return fail("not_found");

    const removed = openExisting.filter((s) => !keepIds.includes(s.id));
    if (removed.length) {
      const [{ inUse } = { inUse: 0 }] = await db
        .select({ inUse: count() })
        .from(deals)
        .where(inArray(deals.stageId, removed.map((s) => s.id)));
      if (inUse > 0) return fail("stage_in_use");
    }

    await db.transaction(async (tx) => {
      if (removed.length) await tx.delete(pipelineStages).where(inArray(pipelineStages.id, removed.map((s) => s.id)));
      let position = 0;
      for (const stage of stages) {
        if (stage.id) {
          await tx.update(pipelineStages).set({ name: stage.name, probability: stage.probability, color: stage.color, position }).where(eq(pipelineStages.id, stage.id));
        } else {
          await tx.insert(pipelineStages).values({ orgId: actor.orgId, name: stage.name, probability: stage.probability, color: stage.color, position, kind: "open" });
        }
        position++;
      }
      // Closed stages always stay at the end.
      const closed = existing.filter((s) => s.kind !== "open").sort((a, b) => a.position - b.position);
      for (const stage of closed) {
        await tx.update(pipelineStages).set({ position: position++ }).where(eq(pipelineStages.id, stage.id));
      }
    });
    await recordAudit(db, { orgId: actor.orgId, actorId: actor.id, action: "pipeline.updated", entityType: "stage", entityLabel: `${stages.length} open stages` });
    return ok(undefined, "pipeline_saved");
  });
}

/* ------------------------------------------------------------------ */
/* Demo workspace                                                      */
/* ------------------------------------------------------------------ */

export async function resetDemoAction() {
  return guarded("workspace:reset", async () => {
    const db = await getDb();
    await resetDatabase(db);
    // All user ids changed — the current session is no longer valid.
    await destroySession();
    return ok(undefined, "demo_reset");
  });
}
