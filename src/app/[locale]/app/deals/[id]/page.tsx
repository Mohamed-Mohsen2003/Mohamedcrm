import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { ChevronLeft } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getDeal, getStages } from "@/server/queries/records";
import { deleteDealAction } from "@/server/actions/records";
import { Link } from "@/lib/i18n/navigation";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { InfoList, NotesPanel, RecordActions, Timeline } from "@/components/shared/record-parts";
import { StageStepper } from "@/components/deals/deal-parts";
import { daysSince, formatDate, formatMoney } from "@/lib/utils/format";
import { PRIORITY_TONE, toneOf } from "@/lib/utils/tones";

type Props = { params: Promise<{ locale: string; id: string }> };
const UUID = /^[0-9a-f-]{36}$/i;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const user = await requireUser();
  const d = UUID.test(id) ? await getDeal(user.orgId, id) : null;
  return { title: d?.title };
}

export default async function DealPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  if (!UUID.test(id)) notFound();
  const user = await requireUser();
  const [t, deal, stages, loc, ts] = await Promise.all([getTranslations(), getDeal(user.orgId, id), getStages(user.orgId), getLocale(), getTranslations("stageNames")]);
  if (!deal) notFound();
  const weighted = Math.round((deal.value * deal.stageProbability) / 100);
  const ageDays = daysSince(deal.createdAt);

  return (
    <>
      <Link href="/app/deals" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ChevronLeft className="size-4 rtl:rotate-180" />
        {t("nav.deals")}
      </Link>
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
            <Badge tone={toneOf(deal.stageColor)}>{ts.has(deal.stageName) ? ts(deal.stageName) : deal.stageName}</Badge>
            <Badge tone={PRIORITY_TONE[deal.priority]}>{t(`enums.priority.${deal.priority}`)}</Badge>
            {deal.companyId && (
              <Link href={`/app/companies/${deal.companyId}`} className="font-medium text-ink-2 hover:text-primary">
                {deal.companyName}
              </Link>
            )}
          </p>
          <h1 className="mt-2 text-balance text-[26px] font-semibold leading-tight tracking-[-0.02em]">{deal.title}</h1>
          <p className="tabular mt-2 text-[32px] font-semibold tracking-[-0.02em] text-ink">
            {formatMoney(deal.value, loc)}
            <span className="ms-3 text-sm font-normal text-muted">
              {t("deals.weighted")} {formatMoney(weighted, loc)} · {deal.stageProbability}%
            </span>
          </p>
        </div>
        <RecordActions
          kind="deal"
          id={deal.id}
          ownerId={deal.ownerId}
          onDelete={deleteDealAction}
          initial={{
            title: deal.title,
            value: deal.value,
            stageId: deal.stageId,
            priority: deal.priority,
            contactId: deal.contactId,
            companyId: deal.companyId,
            ownerId: deal.ownerId,
            expectedCloseDate: deal.expectedCloseDate,
          }}
        />
      </div>

      <div className="mb-4">
        <StageStepper deal={deal} stages={stages} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <Panel>
            <PanelHeader title={t("common.details")} />
            <InfoList
              items={[
                { label: t("deals.expectedClose"), value: formatDate(deal.expectedCloseDate, loc) },
                ...(deal.closedAt ? [{ label: t("deals.closedOn", { date: "" }).trim(), value: formatDate(deal.closedAt, loc) }] : []),
                {
                  label: t("deals.contact"),
                  value: deal.contactId ? (
                    <Link href={`/app/contacts/${deal.contactId}`} className="hover:text-primary">
                      {deal.contactFirstName} {deal.contactLastName}
                    </Link>
                  ) : null,
                },
                {
                  label: t("common.company"),
                  value: deal.companyId ? (
                    <Link href={`/app/companies/${deal.companyId}`} className="hover:text-primary">
                      {deal.companyName}
                    </Link>
                  ) : null,
                },
                {
                  label: t("common.owner"),
                  value: deal.ownerName ? (
                    <span className="flex items-center gap-2">
                      <Avatar name={deal.ownerName} hue={deal.ownerHue} size="xs" />
                      {deal.ownerName}
                    </span>
                  ) : (
                    t("common.unassigned")
                  ),
                },
                { label: t("common.created"), value: `${formatDate(deal.createdAt, loc)} · ${ageDays}d` },
              ]}
            />
          </Panel>
          <Panel>
            <NotesPanel notes={deal.noteItems} entityType="deal" entityId={deal.id} />
          </Panel>
        </div>
        <Panel>
          <Timeline items={deal.timeline} defaults={{ dealId: deal.id, contactId: deal.contactId ?? undefined, companyId: deal.companyId ?? undefined }} />
        </Panel>
      </div>
    </>
  );
}
