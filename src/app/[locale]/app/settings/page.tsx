import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { getStages } from "@/server/queries/records";
import { PageHeader } from "@/components/shared/page-header";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { InfoList } from "@/components/shared/record-parts";
import { AppearanceSettings, PipelineEditor, ResetDemo } from "@/components/settings/settings-parts";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("settings") };
}

export default async function SettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireUser();
  const [t, stages] = await Promise.all([getTranslations(), getStages(user.orgId)]);
  return (
    <>
      <PageHeader title={t("settings.title")} description={t("settings.subtitle")} />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="flex flex-col gap-4">
          <Panel>
            <PanelHeader title={t("settings.profile")} description={t("settings.profileHint")} />
            <div className="flex items-center gap-4 px-5 pb-4">
              <Avatar name={user.name} hue={user.avatarHue} size="lg" />
              <div>
                <p className="text-lg font-semibold">{user.name}</p>
                <p className="text-sm text-muted">{user.title}</p>
              </div>
            </div>
            <InfoList
              items={[
                { label: t("common.email"), value: user.email, ltr: true },
                { label: t("settings.role"), value: <Badge tone={user.role === "admin" ? "saffron" : user.role === "manager" ? "iris" : "jade"}>{t(`enums.role.${user.role}`)}</Badge> },
              ]}
            />
          </Panel>
          <Panel>
            <PanelHeader title={t("settings.appearance")} description={t("settings.appearanceHint")} />
            <AppearanceSettings />
          </Panel>
          {can(user.role, "workspace:reset") && (
            <Panel>
              <PanelHeader title={t("settings.workspace")} />
              <ResetDemo />
            </Panel>
          )}
        </div>
        <Panel>
          <PanelHeader title={t("settings.pipeline")} description={t("settings.pipelineHint")} />
          <PipelineEditor stages={stages} editable={can(user.role, "pipeline:manage")} />
        </Panel>
      </div>
    </>
  );
}
