import { describe, expect, it } from "vitest";
import { can, canModify, PERMISSIONS } from "@/lib/auth/permissions";

describe("RBAC", () => {
  it("admins can do everything", () => {
    for (const permission of Object.keys(PERMISSIONS) as Array<keyof typeof PERMISSIONS>) {
      expect(can("admin", permission)).toBe(true);
    }
  });

  it("managers cannot manage the team, pipeline or reset the workspace", () => {
    expect(can("manager", "team:manage")).toBe(false);
    expect(can("manager", "pipeline:manage")).toBe(false);
    expect(can("manager", "workspace:reset")).toBe(false);
    expect(can("manager", "records:update:any")).toBe(true);
    expect(can("manager", "audit:read")).toBe(true);
  });

  it("reps only act on their own records", () => {
    const rep = { id: "rep-1", role: "rep" as const };
    expect(canModify(rep, "rep-1")).toBe(true);
    expect(canModify(rep, "someone-else")).toBe(false);
    expect(canModify(rep, null)).toBe(false);
    expect(canModify(rep, "rep-1", "delete")).toBe(true);
    expect(can("rep", "records:export")).toBe(false);
    expect(can("rep", "records:reassign")).toBe(false);
    expect(can("rep", "audit:read")).toBe(false);
  });

  it("managers can modify records they do not own", () => {
    expect(canModify({ id: "m", role: "manager" }, "other", "delete")).toBe(true);
  });
});
