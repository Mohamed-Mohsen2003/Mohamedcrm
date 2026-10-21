import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@/lib/db/schema";

export const SESSION_COOKIE = "nexora_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export type SessionPayload = {
  sub: string;
  orgId: string;
  role: Role;
  name: string;
};

const DEV_FALLBACK_SECRET = "nexora-dev-secret-do-not-use-in-production-0123456789";

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === "production") {
      console.warn("[auth] AUTH_SECRET is missing or shorter than 32 characters — falling back to an insecure demo secret.");
    }
    return new TextEncoder().encode(DEV_FALLBACK_SECRET);
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload) {
  return new SignJWT({ orgId: payload.orgId, role: payload.role, name: payload.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setIssuer("nexora-crm")
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secretKey());
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { issuer: "nexora-crm", algorithms: ["HS256"] });
    if (!payload.sub || typeof payload.orgId !== "string" || typeof payload.role !== "string") return null;
    if (!["admin", "manager", "rep"].includes(payload.role)) return null;
    return {
      sub: payload.sub,
      orgId: payload.orgId,
      role: payload.role as Role,
      name: typeof payload.name === "string" ? payload.name : "",
    };
  } catch {
    return null;
  }
}
