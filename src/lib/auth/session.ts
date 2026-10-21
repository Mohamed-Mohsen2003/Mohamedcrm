import { cookies } from "next/headers";
import { cache } from "react";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { users, type User } from "@/lib/db/schema";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, signSession, verifySession, type SessionPayload } from "./token";
import { can, type Permission } from "./permissions";

export type CurrentUser = Pick<User, "id" | "orgId" | "name" | "email" | "role" | "title" | "avatarHue">;

export async function createSession(payload: SessionPayload) {
  const token = await signSession(payload);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

/** Resolves the signed-in user, re-validating against the database once per request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const jar = await cookies();
  const session = await verifySession(jar.get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const db = await getDb();
  const [user] = await db
    .select({
      id: users.id,
      orgId: users.orgId,
      name: users.name,
      email: users.email,
      role: users.role,
      title: users.title,
      avatarHue: users.avatarHue,
    })
    .from(users)
    .where(and(eq(users.id, session.sub), eq(users.orgId, session.orgId), eq(users.isActive, true)))
    .limit(1);
  return user ?? null;
});

/** For pages: redirects to sign-in when there is no session. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export class AuthError extends Error {
  constructor(public code: "unauthenticated" | "forbidden") {
    super(code);
  }
}

/** For server actions: throws instead of redirecting. */
export async function requireActor(permission?: Permission): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("unauthenticated");
  if (permission && !can(user.role, permission)) throw new AuthError("forbidden");
  return user;
}
