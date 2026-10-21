import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireUser } from "@/lib/auth/session";
import { listQuerySchema } from "@/lib/validation/schemas";
import { companyIndustries, listCompanies } from "@/server/queries/records";
import { PageHeader } from "@/components/shared/page-header";
import { CreateButton } from "@/components/shared/create-button";
import { Panel } from "@/components/ui/panel";
import { ClearFilters, ExportButton, FilterSelect, OwnerFilter, Pagination, SearchBox } from "@/components/shared/list-controls";
import { CompaniesTable } from "@/components/contacts/tables";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("companies") };
}

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | undefined>> };

export default async function CompaniesPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireUser();
  const query = listQuerySchema.parse(await searchParams);
  const [t, result, industries] = await Promise.all([getTranslations(), listCompanies(user.orgId, user.id, query), companyIndustries(user.orgId)]);
  return (
    <>
      <PageHeader title={t("companies.title")} description={t("companies.subtitle")} actions={<CreateButton kind="company" label={t("companies.new")} />} />
      <Panel className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-4">
          <SearchBox placeholder={t("companies.searchPlaceholder")} />
          <FilterSelect param="status" label={t("companies.allIndustries")} options={industries.map((i) => ({ value: i, label: i }))} />
          <OwnerFilter />
          <ClearFilters keys={["q", "status", "owner", "sort"]} />
          <div className="ms-auto">
            <ExportButton entity="companies" />
          </div>
        </div>
        <CompaniesTable rows={result.rows} filtered={Boolean(query.q || query.status || query.owner)} />
        <Pagination page={result.page} pageCount={result.pageCount} total={result.total} perPage={result.perPage} />
      </Panel>
    </>
  );
}
