import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireUser } from "@/lib/auth/session";
import { activityCounts, listActivities, type ActivityView } from "@/server/queries/records";
import { PageHeader } from "@/components/shared/page-header";
import { CreateButton } from "@/components/shared/create-button";
import { Panel } from "@/components/ui/panel";
import { FilterSelect, Pagination, Segmented } from "@/components/shared/list-controls";
import { ActivityList } from "@/components/activities/activity-list";
import { ActivityOwnerFilter } from "@/components/activities/owner-filter";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("activities") };
}

const VIEWS: ActivityView[] = ["overdue", "today", "upcoming", "completed", "all"];
type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | undefined>> };

export default async function ActivitiesPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireUser();
  const sp = await searchParams;
  const view: ActivityView = VIEWS.includes(sp.view as ActivityView) ? (sp.view as ActivityView) : "today";
  const owner = sp.owner ?? "me";
  const page = Math.max(1, Number(sp.page) || 1);
  const ownerId = owner === "me" ? user.id : /^[0-9a-f-]{36}$/i.test(owner) ? owner : undefined;
  const [t, result, counts] = await Promise.all([
    getTranslations(),
    listActivities(user.orgId, user.id, { view, type: sp.type, owner, page, perPage: 30 }),
    activityCounts(user.orgId, ownerId),
  ]);

  return (
    <>
      <PageHeader title={t("activities.title")} description={t("activities.subtitle")} actions={<CreateButton kind="activity" label={t("activities.new")} />} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Segmented param="view" fallback="today" options={VIEWS.map((v) => ({ value: v, label: t(`activities.views.${v}`), count: counts[v] }))} />
        <FilterSelect param="type" label={t("activities.allTypes")} options={(["call", "email", "meeting", "task"] as const).map((x) => ({ value: x, label: t(`enums.activityType.${x}`) }))} />
        <ActivityOwnerFilter />
      </div>
      <Panel className="overflow-hidden">
        <ActivityList rows={result.rows} view={view} />
        <Pagination page={result.page} pageCount={result.pageCount} total={result.total} perPage={result.perPage} />
      </Panel>
    </>
  );
}
