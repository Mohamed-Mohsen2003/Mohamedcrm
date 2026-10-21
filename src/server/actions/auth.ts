"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/db/seed";
import { createSession, destroySession } from "@/lib/auth/session";
import { loginSchema } from "@/lib/validation/schemas";
import { fail, fieldErrorsOf, ok, type ActionResult } from "@/lib/validation/result";

// Naive in-memory throttle: 8 failed attempts per e-mail per 10 minutes.
const attempts = new Map<string, { count: number; first: number }>();
const WINDOW_MS = 10 * 60_000;
const MAX_ATTEMPTS = 8;
let dummyHash: string | undefined;

function throttled(key: string) {
  const entry = attempts.get(key);
  if (!entry) return false;
  if (Date.now() - entry.first > WINDOW_MS) {
    attempts.delete(key);
    return false;
  }
  return entry.count >= MAX_ATTEMPTS;
}

function registerFailure(key: string) {
  const entry = attempts.get(key);
  if (!entry || Date.now() - entry.first > WINDOW_MS) attempts.set(key, { count: 1, first: Date.now() });
  else entry.count++;
}

async function signIn(email: string, password: string): Promise<ActionResult<{ name: string }>> {
  if (throttled(email)) return fail("too_many_attempts");
  const db = await getDb();
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  // Always run a hash comparison so response time does not reveal whether the e-mail exists.
  dummyHash ??= await bcrypt.hash("nexora-timing-guard", 10);
  const valid = await bcrypt.compare(password, user?.passwordHash ?? dummyHash);
  if (!user || !valid) {
    registerFailure(email);
    return fail("invalid_credentials");
  }
  if (!user.isActive) return fail("account_disabled");
  attempts.delete(email);
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
  await createSession({ sub: user.id, orgId: user.orgId, role: user.role, name: user.name });
  return ok({ name: user.name });
}

export async function loginAction(formData: FormData) {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return fail("validation", fieldErrorsOf(parsed.error));
  try {
    return await signIn(parsed.data.email, parsed.data.password);
  } catch (error) {
    console.error("[login]", error);
    return fail("server_error");
  }
}

export async function demoLoginAction(role: "admin" | "manager" | "rep") {
  const account = DEMO_ACCOUNTS.find((a) => a.role === role);
  if (!account) return fail("invalid_credentials");
  try {
    return await signIn(account.email, DEMO_PASSWORD);
  } catch (error) {
    console.error("[demo-login]", error);
    return fail("server_error");
  }
}

export async function logoutAction() {
  await destroySession();
  return ok(undefined);
}
