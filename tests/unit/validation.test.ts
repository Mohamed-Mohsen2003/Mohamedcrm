import { describe, expect, it } from "vitest";
import { activitySchema, companySchema, contactSchema, dealSchema, leadSchema, listQuerySchema, loginSchema } from "@/lib/validation/schemas";
import { fieldErrorsOf } from "@/lib/validation/result";

describe("validation schemas", () => {
  it("normalizes login e-mail", () => {
    expect(loginSchema.parse({ email: "  Admin@Nexora.Demo ", password: "x" }).email).toBe("admin@nexora.demo");
  });

  it("treats empty optional fields as undefined and parses money", () => {
    const lead = leadSchema.parse({ firstName: "Omar", lastName: "Haddad", email: "", phone: "", source: "website", status: "new", score: "55", estimatedValue: "$12,500" });
    expect(lead.email).toBeUndefined();
    expect(lead.score).toBe(55);
    expect(lead.estimatedValue).toBe(12500);
  });

  it("rejects converted as a manual lead status", () => {
    const r = leadSchema.safeParse({ firstName: "a", lastName: "b", source: "website", status: "converted", score: 1, estimatedValue: 0 });
    expect(r.success).toBe(false);
  });

  it("returns translatable field error keys", () => {
    const r = leadSchema.safeParse({ firstName: "", lastName: "b", email: "nope", source: "website", status: "new", score: 1, estimatedValue: 0 });
    expect(r.success).toBe(false);
    if (!r.success) {
      const errors = fieldErrorsOf(r.error);
      expect(errors.firstName).toBe("required");
      expect(errors.email).toBe("invalid_email");
    }
  });

  it("splits and lowercases contact tags", () => {
    const c = contactSchema.parse({ firstName: "a", lastName: "b", lifecycle: "lead", tags: "VIP, renewal ,," });
    expect(c.tags).toEqual(["vip", "renewal"]);
  });

  it("validates company domains", () => {
    expect(companySchema.safeParse({ name: "Acme", domain: "acme.com" }).success).toBe(true);
    expect(companySchema.safeParse({ name: "Acme", domain: "not a domain" }).success).toBe(false);
  });

  it("requires a stage on deals and validates dates", () => {
    expect(dealSchema.safeParse({ title: "x", value: 1, priority: "low" }).success).toBe(false);
    expect(dealSchema.safeParse({ title: "x", value: 1, priority: "low", stageId: crypto.randomUUID(), expectedCloseDate: "2026-13-40" }).success).toBe(false);
  });

  it("accepts ISO timestamps with offsets for activities", () => {
    expect(activitySchema.safeParse({ type: "call", subject: "Call", dueAt: "2026-10-21T10:00:00.000Z" }).success).toBe(true);
    expect(activitySchema.safeParse({ type: "call", subject: "Call", dueAt: "tomorrow" }).success).toBe(false);
  });

  it("falls back to safe defaults for bad list queries", () => {
    const q = listQuerySchema.parse({ page: "-4", perPage: "100000", dir: "sideways" });
    expect(q).toMatchObject({ page: 1, perPage: 20, dir: "desc" });
  });
});
