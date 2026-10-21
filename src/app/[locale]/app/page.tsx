import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { requireUser } from "@/lib/auth/session";
import { getDashboard } from "@/server/queries/dashboard";
import { formatMoney } from "@/lib/utils/format";
import { Link } from "@/lib/i18n/navigation";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { PageHeader } from "@/components/shared/page-header";
import { CreateButton } from "@/components/shared/create-button";
import { AuditFeed } from "@/components/shared/audit-feed";
import { Agenda, KpiCard, Leaderboard, RevenueChart, SourceBars, StageBars } from "@/components/dashboard/widgets";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("dashboard") };
}

function delta(current: number, previous: number) {
  if (!previous) return null;
  return (current - previous) / previous;
}

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireUser();
  const [t, data, currentLocale] = await Promise.all([getTranslations(), getDashboard(user.orgId, user.id), getLocale()]);
  const { kpis } = data;
  const hour = Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: "Africa/Cairo" }).format(new Date()));
  const greetingKey = hour < 12 ? "greetingMorning" : hour < 18 ? "greetingAfternoon" : "greetingEvening";
  const firstName = user.name.split(" ")[0] ?? user.name;

  return (
    <>
      <PageHeader
        title={t(`dashboard.${greetingKey}`, { name: firstName })}
        description={
          <>
            {t("dashboard.summary", { today: data.agenda.length, overdue: 0 })}{" "}
            {data.overdueCount > 0 && (
              <Link href="/app/activities?view=overdue" className="font-medium text-rose hover:underline">
                {t("dashboard.overdueLink", { count: data.overdueCount })}
              </Link>
            )}
          </>
        }
        actions={
          <>
            <CreateButton kind="activity" label={t("dashboard.planActivity")} variant="secondary" />
            <CreateButton kind="deal" label={t("deals.new")} />
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          index={0}
          accent
          label={t("dashboard.pipelineValue")}
          value={kpis.pipelineValue}
          format="money"
          hint={t("dashboard.pipelineHint", { count: kpis.openDeals, weighted: formatMoney(kpis.weightedPipeline, currentLocale, "USD", { compact: true }) })}
        />
        <KpiCard
          index={1}
          label={t("dashboard.wonThisMonth")}
          value={kpis.wonThisMonth}
          format="money"
          delta={delta(kpis.wonThisMonth, kpis.wonLastMonth)}
          deltaLabel={t("dashboard.vsLastMonth")}
        />
        <KpiCard index={2} label={t("dashboard.winRate")} value={Math.round(kpis.winRate * 100)} format="percent" hint={t("dashboard.winRateHint")} />
        <KpiCard
          index={3}
          label={t("dashboard.newLeads")}
          value={kpis.newLeads}
          format="number"
          delta={delta(kpis.newLeads, kpis.newLeadsLastMonth)}
          deltaLabel={t("dashboard.openLeads", { count: kpis.openLeads })}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2">
          <PanelHeader
            title={t("dashboard.revenueTitle")}
            description={t("dashboard.revenueSubtitle")}
            action={
              <div className="text-end">
                <p className="tabular text-lg font-semibold text-ink">{formatMoney(data.months.reduce((s, m) => s + m.won, 0), currentLocale, "USD", { compact: true })}</p>
                <p className="text-xs text-muted">
                  {t("dashboard.avgDeal")} {formatMoney(kpis.avgDealSize, currentLocale, "USD", { compact: true })} · {t("dashboard.avgCycle", { days: kpis.avgCycleDays })}
                </p>
              </div>
            }
          />
          <div className="px-3 pb-4">
            <RevenueChart months={data.months} />
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            title={t("dashboard.agendaTitle")}
            description={new Intl.DateTimeFormat(currentLocale === "ar" ? "ar-EG-u-nu-latn" : "en-US", { weekday: "long", day: "numeric", month: "long", timeZone: "Africa/Cairo" }).format(new Date())}
            action={
              <Link href="/app/activities?view=today" className="text-sm font-medium text-primary hover:underline">
                {t("dashboard.viewAll")}
              </Link>
            }
          />
          <Agenda items={data.agenda} />
        </Panel>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Panel>
          <PanelHeader
            title={t("dashboard.pipelineTitle")}
            description={t("dashboard.pipelineSubtitle")}
            action={
              <Link href="/app/deals" className="text-sm font-medium text-primary hover:underline">
                {t("dashboard.viewAll")}
              </Link>
            }
          />
          <StageBars stages={data.byStage} />
        </Panel>
        <Panel>
          <PanelHeader title={t("dashboard.sourcesTitle")} description={t("dashboard.sourcesSubtitle")} />
          <SourceBars sources={data.bySource} />
        </Panel>
        <Panel className="lg:col-span-2 xl:col-span-1">
          <PanelHeader title={t("dashboard.leaderboardTitle")} description={t("dashboard.leaderboardSubtitle")} />
          <Leaderboard rows={data.leaderboard} />
        </Panel>
      </div>

      <Panel className="mt-4">
        <PanelHeader
          title={t("dashboard.feedTitle")}
          action={
            user.role !== "rep" ? (
              <Link href="/app/audit" className="text-sm font-medium text-primary hover:underline">
                {t("dashboard.viewAll")}
              </Link>
            ) : undefined
          }
        />
        <AuditFeed rows={data.feed} compact />
      </Panel>
    </>
  );
}
