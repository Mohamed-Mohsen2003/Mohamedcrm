import type { Role } from "@/lib/db/schema";

/**
 * Role-based access control. Kept free of framework imports so it can be
 * unit-tested and shared by server actions, queries and UI.
 */
export const PERMISSIONS = {
  "records:read": ["admin", "manager", "rep"],
  "records:create": ["admin", "manager", "rep"],
  "records:update:own": ["admin", "manager", "rep"],
  "records:update:any": ["admin", "manager"],
  "records:delete:own": ["admin", "manager", "rep"],
  "records:delete:any": ["admin", "manager"],
  "records:reassign": ["admin", "manager"],
  "records:export": ["admin", "manager"],
  "reports:read": ["admin", "manager", "rep"],
  "audit:read": ["admin", "manager"],
  "team:manage": ["admin"],
  "pipeline:manage": ["admin"],
  "workspace:reset": ["admin"],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: Role, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly Role[]).includes(role);
}

type Actor = { id: string; role: Role };

/** Whether `actor` may modify a record owned by `ownerId`. */
export function canModify(actor: Actor, ownerId: string | null | undefined, kind: "update" | "delete" = "update") {
  if (can(actor.role, kind === "update" ? "records:update:any" : "records:delete:any")) return true;
  return Boolean(ownerId) && ownerId === actor.id && can(actor.role, kind === "update" ? "records:update:own" : "records:delete:own");
}

export const ROLE_RANK: Record<Role, number> = { rep: 1, manager: 2, admin: 3 };
