import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LayoutList, SquareKanban } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { listQuerySchema } from "@/lib/validation/schemas";
import { getBoard, listDeals } from "@/server/queries/records";
import { PageHeader } from "@/components/shared/page-header";
import { CreateButton } from "@/components/shared/create-button";
import { Panel } from "@/components/ui/panel";
import { ClearFilters, ExportButton, FilterSelect, OwnerFilter, Pagination, SearchBox, Segmented } from "@/components/shared/list-controls";
import { DealBoard } from "@/components/deals/board";
import { DealsTable } from "@/components/deals/deal-parts";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("deals") };
}

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | undefined>> };

export default async function DealsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireUser();
  const sp = await searchParams;
  const view = sp.view === "list" ? "list" : "board";
  const t = await getTranslations();

  const viewToggle = (
    <Segmented
      param="view"
      fallback="board"
      options={[
        { value: "board", label: <span className="flex items-center gap-1.5"><SquareKanban className="size-4" />{t("deals.board")}</span> },
        { value: "list", label: <span className="flex items-center gap-1.5"><LayoutList className="size-4" />{t("deals.list")}</span> },
      ]}
    />
  );

  const priorityFilter = (
    <FilterSelect param="priority" label={t("deals.allPriorities")} options={(["high", "medium", "low"] as const).map((p) => ({ value: p, label: t(`enums.priority.${p}`) }))} />
  );

  if (view === "board") {
    const board = await getBoard(user.orgId, user.id, { q: sp.q?.slice(0, 100), owner: sp.owner, priority: sp.priority });
    return (
      <>
        <PageHeader title={t("deals.title")} description={t("deals.subtitle")} actions={<CreateButton kind="deal" label={t("deals.new")} />} />
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {viewToggle}
          <SearchBox placeholder={t("deals.searchPlaceholder")} />
          {priorityFilter}
          <OwnerFilter />
          <ClearFilters keys={["q", "owner", "priority"]} />
          <p className="ms-auto hidden text-xs text-muted xl:block">{t("deals.recentClosed")}</p>
        </div>
        <DealBoard initial={board} />
      </>
    );
  }

  const query = listQuerySchema.parse(sp);
  const result = await listDeals(user.orgId, user.id, query);
  return (
    <>
      <PageHeader title={t("deals.title")} description={t("deals.subtitle")} actions={<CreateButton kind="deal" label={t("deals.new")} />} />
      <div className="mb-4 flex flex-wrap items-center gap-2">{viewToggle}</div>
      <Panel className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-4">
          <SearchBox placeholder={t("deals.searchPlaceholder")} />
          <FilterSelect
            param="status"
            label={t("deals.allStatuses")}
            options={[
              { value: "open", label: t("deals.statusOpen") },
              { value: "won", label: t("deals.statusWon") },
              { value: "lost", label: t("deals.statusLost") },
            ]}
          />
          <OwnerFilter />
          <ClearFilters keys={["q", "status", "owner", "sort"]} />
          <div className="ms-auto">
            <ExportButton entity="deals" />
          </div>
        </div>
        <DealsTable rows={result.rows} filtered={Boolean(query.q || query.status || query.owner)} />
        <Pagination page={result.page} pageCount={result.pageCount} total={result.total} perPage={result.perPage} />
      </Panel>
    </>
  );
}
