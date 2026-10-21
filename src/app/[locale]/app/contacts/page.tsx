import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireUser } from "@/lib/auth/session";
import { listQuerySchema } from "@/lib/validation/schemas";
import { listContacts } from "@/server/queries/records";
import { PageHeader } from "@/components/shared/page-header";
import { CreateButton } from "@/components/shared/create-button";
import { Panel } from "@/components/ui/panel";
import { ClearFilters, ExportButton, FilterSelect, OwnerFilter, Pagination, SearchBox } from "@/components/shared/list-controls";
import { ContactsTable } from "@/components/contacts/tables";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("contacts") };
}

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | undefined>> };

export default async function ContactsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireUser();
  const query = listQuerySchema.parse(await searchParams);
  const [t, result] = await Promise.all([getTranslations(), listContacts(user.orgId, user.id, query)]);
  return (
    <>
      <PageHeader title={t("contacts.title")} description={t("contacts.subtitle")} actions={<CreateButton kind="contact" label={t("contacts.new")} />} />
      <Panel className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-4">
          <SearchBox placeholder={t("contacts.searchPlaceholder")} />
          <FilterSelect
            param="status"
            label={t("contacts.allStages")}
            options={(["lead", "opportunity", "customer", "churned"] as const).map((s) => ({ value: s, label: t(`enums.lifecycle.${s}`) }))}
          />
          <OwnerFilter />
          <ClearFilters keys={["q", "status", "owner", "sort"]} />
          <div className="ms-auto">
            <ExportButton entity="contacts" />
          </div>
        </div>
        <ContactsTable rows={result.rows} filtered={Boolean(query.q || query.status || query.owner)} />
        <Pagination page={result.page} pageCount={result.pageCount} total={result.total} perPage={result.perPage} />
      </Panel>
    </>
  );
}
