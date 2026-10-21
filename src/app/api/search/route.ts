import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { globalSearch } from "@/server/queries/records";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const q = (request.nextUrl.searchParams.get("q") ?? "").slice(0, 100);
  const results = await globalSearch(user.orgId, q);
  return NextResponse.json(results, { headers: { "Cache-Control": "private, no-store" } });
}
