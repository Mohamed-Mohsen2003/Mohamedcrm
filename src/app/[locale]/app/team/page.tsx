import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { getTeam } from "@/server/queries/insights";
import { PageHeader } from "@/components/shared/page-header";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { InviteMember, TeamTable } from "@/components/settings/team";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("team") };
}

export default async function TeamPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireUser();
  const [t, members] = await Promise.all([getTranslations(), getTeam(user.orgId)]);
  const manage = can(user.role, "team:manage");
  return (
    <>
      <PageHeader title={t("team.title")} description={t("team.subtitle")} actions={manage ? <InviteMember /> : undefined} />
      <Panel className="overflow-hidden">
        <TeamTable members={members} />
        {!manage && <p className="border-t border-line px-5 py-3 text-sm text-muted">{t("team.readOnly")}</p>}
      </Panel>
      <Panel className="mt-4">
        <PanelHeader title={t("team.permissionsTitle")} />
        <ul className="grid grid-cols-1 gap-3 px-5 pb-5 md:grid-cols-3">
          {(["admin", "manager", "rep"] as const).map((r) => (
            <li key={r} className="rounded-xl border border-line bg-surface-2 p-4">
              <Badge tone={r === "admin" ? "saffron" : r === "manager" ? "iris" : "jade"}>{t(`enums.role.${r}`)}</Badge>
              <p className="mt-2.5 text-sm leading-relaxed text-ink-2">{t(`team.permissions.${r}`)}</p>
            </li>
          ))}
        </ul>
      </Panel>
    </>
  );
}
