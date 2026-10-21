import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { ChevronLeft, Mail, Phone } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getContact } from "@/server/queries/records";
import { deleteContactAction } from "@/server/actions/records";
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
  const c = UUID.test(id) ? await getContact(user.orgId, id) : null;
  return { title: c ? `${c.firstName} ${c.lastName}` : undefined };
}

export default async function ContactPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  if (!UUID.test(id)) notFound();
  const user = await requireUser();
  const [t, c, loc] = await Promise.all([getTranslations(), getContact(user.orgId, id), getLocale()]);
  if (!c) notFound();
  const name = `${c.firstName} ${c.lastName}`;
  const openValue = c.deals.filter((d) => d.stageKind === "open").reduce((s, d) => s + d.value, 0);
  const wonValue = c.deals.filter((d) => d.stageKind === "won").reduce((s, d) => s + d.value, 0);

  return (
    <>
      <Link href="/app/contacts" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ChevronLeft className="size-4 rtl:rotate-180" />
        {t("nav.contacts")}
      </Link>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <Avatar name={name} hue={(c.firstName.charCodeAt(0) * 37) % 360} size="lg" />
          <div className="min-w-0">
            <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.02em]">{name}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
              <Badge tone={LIFECYCLE_TONE[c.lifecycle]}>{t(`enums.lifecycle.${c.lifecycle}`)}</Badge>
              {c.jobTitle && <span>{c.jobTitle}</span>}
              {c.companyId && (
                <>
                  <span aria-hidden>·</span>
                  <Link href={`/app/companies/${c.companyId}`} className="font-medium text-ink-2 hover:text-primary">
                    {c.companyName}
                  </Link>
                </>
              )}
            </p>
          </div>
        </div>
        <RecordActions
          kind="contact"
          id={c.id}
          ownerId={c.ownerId}
          onDelete={deleteContactAction}
          initial={{ firstName: c.firstName, lastName: c.lastName, email: c.email, phone: c.phone, jobTitle: c.jobTitle, companyId: c.companyId, lifecycle: c.lifecycle, tags: c.tags, ownerId: c.ownerId }}
          extra={
            <>
              {c.email && (
                <a href={`mailto:${c.email}`} className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-control)] border border-line bg-surface px-4 text-sm font-medium shadow-1 hover:bg-surface-2">
                  <Mail className="size-4" />
                  {t("common.email")}
                </a>
              )}
              {c.phone && (
                <a href={`tel:${c.phone}`} className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-control)] border border-line bg-surface px-4 text-sm font-medium shadow-1 hover:bg-surface-2">
                  <Phone className="size-4" />
                  {t("enums.activityType.call")}
                </a>
              )}
            </>
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <Panel>
            <PanelHeader title={t("common.details")} />
            <InfoList
              items={[
                { label: t("common.email"), value: c.email, ltr: true },
                { label: t("common.phone"), value: c.phone, ltr: true },
                { label: t("common.company"), value: c.companyName },
                { label: t("contacts.tags"), value: c.tags.length ? c.tags.map((tag) => `#${tag}`).join("  ") : null },
                { label: t("common.owner"), value: c.ownerName ?? t("common.unassigned") },
                { label: t("companies.openPipeline"), value: <span className="tabular">{formatMoney(openValue, loc)}</span> },
                { label: t("companies.wonRevenue"), value: <span className="tabular text-primary-strong">{formatMoney(wonValue, loc)}</span> },
                { label: t("common.created"), value: formatDate(c.createdAt, loc) },
              ]}
            />
          </Panel>
          <Panel>
            <NotesPanel notes={c.noteItems} entityType="contact" entityId={c.id} />
          </Panel>
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <Panel>
            <PanelHeader
              title={t("contacts.deals")}
              action={<CreateButton kind="deal" variant="secondary" label={t("deals.new")} defaults={{ contactId: c.id, companyId: c.companyId ?? undefined }} />}
            />
            <RelatedDeals deals={c.deals} emptyLabel={t("contacts.noDeals")} />
          </Panel>
          <Panel>
            <Timeline items={c.timeline} defaults={{ contactId: c.id, companyId: c.companyId ?? undefined }} />
          </Panel>
        </div>
      </div>
    </>
  );
}
