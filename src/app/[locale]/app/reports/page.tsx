import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { requireUser } from "@/lib/auth/session";
import { getReports } from "@/server/queries/insights";
import { PageHeader } from "@/components/shared/page-header";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Segmented } from "@/components/shared/list-controls";
import { KpiCard } from "@/components/dashboard/widgets";
import { ActivityMix, ForecastChart, LossReasons, RepBars, SourceFunnel, StageHealth } from "@/components/reports/charts";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("reports") };
}

const RANGES = ["30", "90", "180", "365"] as const;
type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | undefined>> };

export default async function ReportsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireUser();
  const sp = await searchParams;
  const range = (RANGES as readonly string[]).includes(sp.range ?? "") ? (sp.range as (typeof RANGES)[number]) : "180";
  const [t, data] = await Promise.all([getTranslations(), getReports(user.orgId, Number(range)), getLocale()]);
  const decided = data.totals.wonCount + data.totals.lostCount;

  return (
    <>
      <PageHeader
        title={t("reports.title")}
        description={t("reports.subtitle")}
        actions={<Segmented param="range" fallback="180" options={RANGES.map((r) => ({ value: r, label: t(`reports.ranges.${r}`) }))} />}
      />
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard index={0} accent label={t("reports.wonRevenue")} value={data.totals.won} format="money" />
        <KpiCard index={1} label={t("reports.dealsWon")} value={data.totals.wonCount} format="number" />
        <KpiCard index={2} label={t("reports.dealsLost")} value={data.totals.lostCount} format="number" />
        <KpiCard index={3} label={t("reports.winRate")} value={decided ? Math.round((data.totals.wonCount / decided) * 100) : 0} format="percent" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel>
          <PanelHeader title={t("reports.byRep")} description={t("reports.byRepSubtitle")} />
          <RepBars rows={data.byOwner} />
        </Panel>
        <Panel>
          <PanelHeader title={t("reports.forecast")} description={t("reports.forecastSubtitle")} />
          <ForecastChart rows={data.forecast} />
        </Panel>
      </div>

      <Panel className="mt-4 overflow-hidden">
        <PanelHeader title={t("reports.funnel")} description={t("reports.funnelSubtitle")} />
        <SourceFunnel rows={data.sourceFunnel} />
      </Panel>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel>
          <PanelHeader title={t("reports.lossReasons")} description={t("reports.lossReasonsSubtitle")} />
          <LossReasons rows={data.lostReasons} />
        </Panel>
        <Panel>
          <PanelHeader title={t("reports.velocity")} description={t("reports.velocitySubtitle")} />
          <StageHealth rows={data.stageVelocity} />
        </Panel>
        <Panel>
          <PanelHeader title={t("reports.activityMix")} description={t("reports.activityMixSubtitle")} />
          <ActivityMix rows={data.activityMix} />
        </Panel>
      </div>
    </>
  );
}
