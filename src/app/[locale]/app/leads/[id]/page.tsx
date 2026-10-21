import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { ChevronLeft, CircleCheck } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getLead } from "@/server/queries/records";
import { deleteLeadsAction } from "@/server/actions/records";
import { Link } from "@/lib/i18n/navigation";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { ScoreRing } from "@/components/ui/misc";
import { InfoList, NotesPanel, RecordActions, Timeline } from "@/components/shared/record-parts";
import { ConvertLead } from "@/components/leads/convert-lead";
import { formatDate, formatMoney } from "@/lib/utils/format";
import { LEAD_STATUS_TONE } from "@/lib/utils/tones";

type Props = { params: Promise<{ locale: string; id: string }> };

const UUID = /^[0-9a-f-]{36}$/i;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const user = await requireUser();
  const lead = UUID.test(id) ? await getLead(user.orgId, id) : null;
  return { title: lead ? `${lead.firstName} ${lead.lastName}` : undefined };
}

async function deleteLead(id: string) {
  "use server";
  return deleteLeadsAction([id]);
}

export default async function LeadPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  if (!UUID.test(id)) notFound();
  const user = await requireUser();
  const [t, lead, loc] = await Promise.all([getTranslations(), getLead(user.orgId, id), getLocale()]);
  if (!lead) notFound();
  const name = `${lead.firstName} ${lead.lastName}`;
  const converted = lead.status === "converted";

  return (
    <>
      <Link href="/app/leads" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ChevronLeft className="size-4 rtl:rotate-180" />
        {t("nav.leads")}
      </Link>

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <ScoreRing value={lead.score} size={60} label={`${t("leads.score")} ${lead.score}`} />
          <div className="min-w-0">
            <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.02em]">{name}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
              <Badge tone={LEAD_STATUS_TONE[lead.status]}>{t(`enums.leadStatus.${lead.status}`)}</Badge>
              {lead.jobTitle && <span>{lead.jobTitle}</span>}
              {lead.companyName && <span>· {lead.companyName}</span>}
            </p>
          </div>
        </div>
        <RecordActions
          kind="lead"
          id={lead.id}
          ownerId={lead.ownerId}
          canEdit={!converted}
          onDelete={deleteLead}
          initial={{
            firstName: lead.firstName,
            lastName: lead.lastName,
            email: lead.email,
            phone: lead.phone,
            companyName: lead.companyName,
            jobTitle: lead.jobTitle,
            source: lead.source,
            status: lead.status,
            score: lead.score,
            estimatedValue: lead.estimatedValue,
            ownerId: lead.ownerId,
            notes: lead.notes,
          }}
          extra={!converted ? <ConvertLead lead={lead} /> : null}
        />
      </div>

      {converted && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-[var(--radius-panel)] border border-primary/30 bg-primary-soft px-5 py-4 text-sm">
          <CircleCheck className="size-5 text-primary" />
          <span className="font-medium text-primary-strong">
            {t("leads.convertedTo")} · {formatDate(lead.convertedAt, loc)}
          </span>
          <span className="ms-auto flex gap-4">
            {lead.convertedContactId && (
              <Link href={`/app/contacts/${lead.convertedContactId}`} className="font-medium text-primary-strong underline underline-offset-4">
                {t("leads.viewContact")}
              </Link>
            )}
            {lead.convertedDealId && (
              <Link href={`/app/deals/${lead.convertedDealId}`} className="font-medium text-primary-strong underline underline-offset-4">
                {t("leads.viewDeal")}
              </Link>
            )}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <Panel>
            <PanelHeader title={t("leads.profile")} />
            <InfoList
              items={[
                { label: t("common.email"), value: lead.email ? <a className="hover:text-primary" href={`mailto:${lead.email}`}>{lead.email}</a> : null, ltr: true },
                { label: t("common.phone"), value: lead.phone ? <a className="hover:text-primary" href={`tel:${lead.phone}`}>{lead.phone}</a> : null, ltr: true },
                { label: t("common.company"), value: lead.companyName },
                { label: t("common.source"), value: t(`enums.leadSource.${lead.source}`) },
                { label: t("leads.estimatedValue"), value: <span className="tabular">{formatMoney(lead.estimatedValue, loc)}</span> },
                {
                  label: t("common.owner"),
                  value: lead.ownerName ? (
                    <span className="flex items-center gap-2">
                      <Avatar name={lead.ownerName} hue={lead.ownerHue} size="xs" />
                      {lead.ownerName}
                    </span>
                  ) : (
                    t("common.unassigned")
                  ),
                },
                { label: t("common.created"), value: formatDate(lead.createdAt, loc) },
              ]}
            />
            {lead.notes && (
              <div className="border-t border-line px-5 py-4">
                <p className="mb-1 text-xs text-muted">{t("leads.notesLabel")}</p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-2">{lead.notes}</p>
              </div>
            )}
          </Panel>
          <Panel>
            <NotesPanel notes={lead.noteItems} entityType="lead" entityId={lead.id} />
          </Panel>
        </div>
        <Panel>
          <Timeline items={lead.timeline} defaults={{ leadId: lead.id }} />
        </Panel>
      </div>
    </>
  );
}
