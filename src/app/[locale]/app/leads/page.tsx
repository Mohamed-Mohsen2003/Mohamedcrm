import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireUser } from "@/lib/auth/session";
import { listQuerySchema } from "@/lib/validation/schemas";
import { leadStatusCounts, listLeads } from "@/server/queries/records";
import { PageHeader } from "@/components/shared/page-header";
import { CreateButton } from "@/components/shared/create-button";
import { Panel } from "@/components/ui/panel";
import { ClearFilters, ExportButton, FilterSelect, OwnerFilter, Pagination, SearchBox, Segmented } from "@/components/shared/list-controls";
import { LeadsTable } from "@/components/leads/leads-table";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("leads") };
}

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | undefined>> };

export default async function LeadsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireUser();
  const sp = await searchParams;
  const query = listQuerySchema.parse(sp);
  const [t, result, counts] = await Promise.all([getTranslations(), listLeads(user.orgId, user.id, query), leadStatusCounts(user.orgId)]);
  const count = (s: string) => counts.find((c) => c.status === s)?.count ?? 0;
  const statuses = ["new", "contacted", "qualified", "unqualified", "converted"] as const;
  const filtered = Boolean(query.q || query.status || query.source || query.owner);

  return (
    <>
      <PageHeader title={t("leads.title")} description={t("leads.subtitle")} actions={<CreateButton kind="lead" label={t("leads.new")} />} />

      <div className="mb-4">
        <Segmented
          param="status"
          fallback=""
          options={[
            { value: "", label: t("common.all"), count: counts.reduce((s, c) => s + c.count, 0) },
            ...statuses.map((s) => ({ value: s, label: t(`enums.leadStatus.${s}`), count: count(s) })),
          ]}
        />
      </div>

      <Panel className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-4">
          <SearchBox placeholder={t("leads.searchPlaceholder")} />
          <FilterSelect
            param="source"
            label={t("leads.allSources")}
            options={(["website", "referral", "linkedin", "cold_call", "event", "ads", "partner"] as const).map((s) => ({ value: s, label: t(`enums.leadSource.${s}`) }))}
          />
          <OwnerFilter />
          <ClearFilters keys={["q", "status", "source", "owner", "sort"]} />
          <div className="ms-auto">
            <ExportButton entity="leads" />
          </div>
        </div>
        <LeadsTable rows={result.rows} filtered={filtered} />
        <Pagination page={result.page} pageCount={result.pageCount} total={result.total} perPage={result.perPage} />
      </Panel>
    </>
  );
}
