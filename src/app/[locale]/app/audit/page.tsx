import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { listAudit } from "@/server/queries/insights";
import { PageHeader } from "@/components/shared/page-header";
import { Panel } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/misc";
import { AuditFeed } from "@/components/shared/audit-feed";
import { FilterSelect, Pagination } from "@/components/shared/list-controls";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("audit") };
}

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | undefined>> };

export default async function AuditPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireUser();
  if (!can(user.role, "audit:read")) notFound();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const [t, result] = await Promise.all([getTranslations(), listAudit(user.orgId, { page, perPage: 25, entity: sp.entity })]);
  return (
    <>
      <PageHeader
        title={t("audit.title")}
        description={t("audit.subtitle")}
        actions={
          <FilterSelect
            param="entity"
            label={t("audit.allEntities")}
            options={(["deal", "lead", "contact", "company", "activity", "user", "stage"] as const).map((e) => ({
              value: e,
              label: e === "stage" ? t("settings.pipeline") : e === "user" ? t("nav.team") : t(`nav.${e === "company" ? "companies" : e === "activity" ? "activities" : `${e}s`}`),
            }))}
          />
        }
      />
      <Panel className="overflow-hidden">
        {result.rows.length === 0 ? (
          <EmptyState title={t("audit.empty")} />
        ) : (
          <div className="p-5">
            <AuditFeed rows={result.rows} />
          </div>
        )}
        <Pagination page={result.page} pageCount={result.pageCount} total={result.total} perPage={result.perPage} />
      </Panel>
    </>
  );
}
