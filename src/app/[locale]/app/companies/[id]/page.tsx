import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { ChevronLeft, ExternalLink } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getCompany } from "@/server/queries/records";
import { deleteCompanyAction } from "@/server/actions/records";
import { Link } from "@/lib/i18n/navigation";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { InfoList, NotesPanel, RecordActions, Timeline } from "@/components/shared/record-parts";
import { RelatedDeals } from "@/components/deals/related-deals";
import { CreateButton } from "@/components/shared/create-button";
import { formatDate, formatMoney } from "@/lib/utils/format";
import { LIFECYCLE_TONE } from "@/lib/utils/tones";

type Props = { params: Promise<{ locale: string; id: string }> };
const UUID = /^[0-9a-f-]{36}$/i;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const user = await requireUser();
  const c = UUID.test(id) ? await getCompany(user.orgId, id) : null;
  return { title: c?.name };
}

export default async function CompanyPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  if (!UUID.test(id)) notFound();
  const user = await requireUser();
  const [t, c, loc] = await Promise.all([getTranslations(), getCompany(user.orgId, id), getLocale()]);
  if (!c) notFound();
  const sum = (kind: string) => c.deals.filter((d) => d.stageKind === kind).reduce((s, d) => s + d.value, 0);
  const stats = [
    { label: t("companies.openPipeline"), value: formatMoney(sum("open"), loc) },
    { label: t("companies.wonRevenue"), value: formatMoney(sum("won"), loc) },
    { label: t("companies.contacts"), value: String(c.contacts.length) },
    { label: t("contacts.deals"), value: String(c.deals.length) },
  ];

  return (
    <>
      <Link href="/app/companies" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ChevronLeft className="size-4 rtl:rotate-180" />
        {t("nav.companies")}
      </Link>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-sidebar text-xl font-semibold text-white">{c.name.slice(0, 1)}</span>
          <div className="min-w-0">
            <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.02em]">{c.name}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
              {c.industry && <span>{c.industry}</span>}
              {(c.city || c.country) && <span>· {[c.city, c.country].filter(Boolean).join(", ")}</span>}
              {c.domain && (
                <span className="inline-flex items-center gap-1" dir="ltr">
                  · {c.domain}
                  <ExternalLink className="size-3" aria-hidden />
                </span>
              )}
            </p>
          </div>
        </div>
        <RecordActions
          kind="company"
          id={c.id}
          ownerId={c.ownerId}
          onDelete={deleteCompanyAction}
          initial={{ name: c.name, domain: c.domain, industry: c.industry, size: c.size, country: c.country, city: c.city, phone: c.phone, annualRevenue: c.annualRevenue, ownerId: c.ownerId }}
        />
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-[var(--radius-panel)] border border-line bg-surface p-4 shadow-1">
            <p className="text-xs text-muted">{s.label}</p>
            <p className="tabular mt-1.5 text-xl font-semibold text-ink">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <Panel>
            <PanelHeader title={t("common.details")} />
            <InfoList
              items={[
                { label: t("companies.domain"), value: c.domain, ltr: true },
                { label: t("common.phone"), value: c.phone, ltr: true },
                { label: t("companies.size"), value: c.size },
                { label: t("companies.annualRevenue"), value: c.annualRevenue ? <span className="tabular">{formatMoney(c.annualRevenue, loc)}</span> : null },
                {
                  label: t("common.owner"),
                  value: c.ownerName ? (
                    <span className="flex items-center gap-2">
                      <Avatar name={c.ownerName} hue={c.ownerHue} size="xs" />
                      {c.ownerName}
                    </span>
                  ) : (
                    t("common.unassigned")
                  ),
                },
                { label: t("common.created"), value: formatDate(c.createdAt, loc) },
              ]}
            />
          </Panel>
          <Panel>
            <PanelHeader title={t("companies.people")} action={<CreateButton kind="contact" variant="secondary" label={t("contacts.new")} defaults={{ companyId: c.id }} />} />
            {c.contacts.length === 0 ? (
              <p className="px-5 pb-5 text-sm text-muted">{t("companies.noPeople")}</p>
            ) : (
              <ul className="divide-y divide-line border-t border-line">
                {c.contacts.map((p) => (
                  <li key={p.id}>
                    <Link href={`/app/contacts/${p.id}`} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-2">
                      <Avatar name={`${p.firstName} ${p.lastName}`} hue={(p.firstName.charCodeAt(0) * 37) % 360} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">
                          {p.firstName} {p.lastName}
                        </p>
                        <p className="truncate text-xs text-muted">{p.jobTitle}</p>
                      </div>
                      <Badge tone={LIFECYCLE_TONE[p.lifecycle]}>{t(`enums.lifecycle.${p.lifecycle}`)}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel>
            <NotesPanel notes={c.noteItems} entityType="company" entityId={c.id} />
          </Panel>
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <Panel>
            <PanelHeader title={t("contacts.deals")} action={<CreateButton kind="deal" variant="secondary" label={t("deals.new")} defaults={{ companyId: c.id }} />} />
            <RelatedDeals deals={c.deals} emptyLabel={t("contacts.noDeals")} />
          </Panel>
          <Panel>
            <Timeline items={c.timeline} defaults={{ companyId: c.id }} />
          </Panel>
        </div>
      </div>
    </>
  );
}
