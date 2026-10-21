"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { Lookups } from "@/server/queries/records";
import type { CurrentUser } from "@/lib/auth/session";
import { can, canModify, type Permission } from "@/lib/auth/permissions";

export type CreateKind = "lead" | "contact" | "company" | "deal" | "activity";
export type CreateRequest = { kind: CreateKind; defaults?: Record<string, string | undefined> };

type WorkspaceContext = {
  user: CurrentUser;
  lookups: Lookups;
  can: (permission: Permission) => boolean;
  canModify: (ownerId: string | null | undefined, kind?: "update" | "delete") => boolean;
  create: CreateRequest | null;
  openCreate: (kind: CreateKind, defaults?: CreateRequest["defaults"]) => void;
  closeCreate: () => void;
};

const Ctx = createContext<WorkspaceContext | null>(null);

export function WorkspaceProvider({ user, lookups, children }: { user: CurrentUser; lookups: Lookups; children: ReactNode }) {
  const [create, setCreate] = useState<CreateRequest | null>(null);
  const openCreate = useCallback((kind: CreateKind, defaults?: CreateRequest["defaults"]) => setCreate({ kind, defaults }), []);
  const closeCreate = useCallback(() => setCreate(null), []);
  const value = useMemo<WorkspaceContext>(
    () => ({
      user,
      lookups,
      can: (p) => can(user.role, p),
      canModify: (ownerId, kind) => canModify(user, ownerId, kind),
      create,
      openCreate,
      closeCreate,
    }),
    [user, lookups, create, openCreate, closeCreate],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWorkspace must be used inside <WorkspaceProvider>");
  return ctx;
}
