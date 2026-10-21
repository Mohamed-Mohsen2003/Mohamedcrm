import type { Metadata } from "next";
import type { ReactNode } from "react";
import { setRequestLocale } from "next-intl/server";
import { requireUser } from "@/lib/auth/session";
import { getLookups } from "@/server/queries/records";
import { WorkspaceProvider } from "@/components/shared/workspace-context";
import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AppLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireUser();
  const lookups = await getLookups(user.orgId);
  return (
    <WorkspaceProvider user={user} lookups={lookups}>
      <AppShell>{children}</AppShell>
    </WorkspaceProvider>
  );
}
