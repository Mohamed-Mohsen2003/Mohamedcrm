"use client";

import { useId, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useStageName } from "@/hooks/use-stage-name";
import { toast } from "sonner";
import { motion } from "motion/react";
import { Check, SquareKanban, Trophy, X } from "lucide-react";
import { Link, useRouter } from "@/lib/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Field, Select } from "@/components/ui/field";
import { SortHeader } from "@/components/shared/list-controls";
import { useWorkspace } from "@/components/shared/workspace-context";
import { moveDealAction } from "@/server/actions/records";
import { formatDate, formatMoney } from "@/lib/utils/format";
import { PRIORITY_TONE, TONES, toneOf } from "@/lib/utils/tones";
import { LOST_REASONS, lostReasonKey } from "@/lib/utils/lost-reasons";
import { cn } from "@/lib/utils/cn";
import type { DealRow, Lookups } from "@/server/queries/records";

/* ------------------------------------------------------------------ */
/* List view                                                           */
/* ------------------------------------------------------------------ */

export function DealsTable({ rows, filtered }: { rows: DealRow[]; filtered: boolean }) {
  const t = useTranslations();
  const locale = useLocale();
  const sn = useStageName();
  const { openCreate } = useWorkspace();
  if (rows.length === 0) {
    return filtered ? (
      <EmptyState icon={<SquareKanban />} title={t("common.noResults")} description={t("common.noResultsHint")} />
    ) : (
      <EmptyState icon={<SquareKanban />} title={t("deals.empty")} description={t("deals.emptyHint")} action={<Button onClick={() => openCreate("deal")}>{t("deals.new")}</Button>} />
    );
  }
  return (
    <div className="scrollbar-thin overflow-x-auto">
      <table className="w-full min-w-[960px] text-sm [&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
        <thead className="border-b border-line bg-surface-2/60 text-xs text-muted">
          <tr>
            <SortHeader column="title">{t("deals.dealTitle")}</SortHeader>
            <SortHeader column="stage">{t("deals.stage")}</SortHeader>
            <SortHeader column="value" className="text-end">{t("common.value")}</SortHeader>
            <th scope="col" className="px-4 py-3 text-start font-medium">{t("deals.priority")}</th>
            <SortHeader column="close">{t("deals.expectedClose")}</SortHeader>
            <th scope="col" className="px-4 py-3 text-start font-medium">{t("deals.contact")}</th>
            <th scope="col" className="px-4 py-3 text-start font-medium">{t("common.owner")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((d) => (
            <tr key={d.id} className="transition-colors hover:bg-surface-2">
              <td className="max-w-[340px] px-4 py-3">
                <Link href={`/app/deals/${d.id}`} className="block truncate font-medium text-ink hover:text-primary">
                  {d.title}
                </Link>
              </td>
              <td className="px-4 py-3">
                <Badge tone={toneOf(d.stageColor)}>{sn(d.stageName)}</Badge>
              </td>
              <td className="tabular px-4 py-3 text-end font-semibold text-ink">{formatMoney(d.value, locale)}</td>
              <td className="px-4 py-3">
                <span className="flex items-center gap-1.5 text-ink-2">
                  <span className={cn("size-2 rounded-full", TONES[PRIORITY_TONE[d.priority]].dot)} />
                  {t(`enums.priority.${d.priority}`)}
                </span>
              </td>
              <td className="px-4 py-3 text-ink-2">{d.closedAt ? formatDate(d.closedAt, locale) : formatDate(d.expectedCloseDate, locale)}</td>
              <td className="px-4 py-3 text-ink-2">{d.contactFirstName ? `${d.contactFirstName} ${d.contactLastName}` : "—"}</td>
              <td className="px-4 py-3">
                {d.ownerName && (
                  <span className="flex items-center gap-2 text-ink-2">
                    <Avatar name={d.ownerName} hue={d.ownerHue} size="xs" />
                    {d.ownerName}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Stage stepper on the deal page                                      */
/* ------------------------------------------------------------------ */

export function StageStepper({ deal, stages }: { deal: DealRow; stages: Lookups["stages"] }) {
  const t = useTranslations();
  const router = useRouter();
  const p = useId();
  const sn = useStageName();
  const { canModify } = useWorkspace();
  const [pending, start] = useTransition();
  const [lostOpen, setLostOpen] = useState(false);
  const editable = canModify(deal.ownerId);
  const open = stages.filter((s) => s.kind === "open");
  const won = stages.find((s) => s.kind === "won");
  const lost = stages.find((s) => s.kind === "lost");
  const currentIndex = open.findIndex((s) => s.id === deal.stageId);
  const isClosed = deal.stageKind !== "open";

  const move = (stageId: string, lostReason?: string) =>
    start(async () => {
      const r = await moveDealAction({ dealId: deal.id, stageId, index: 0, lostReason });
      if (!r.ok) {
        toast.error(t.has(`errors.${r.error}`) ? t(`errors.${r.error}`) : t("errors.server_error"));
        return;
      }
      const kind = stages.find((s) => s.id === stageId)?.kind;
      if (kind === "won") toast.success(t("toasts.deal_won"));
      else if (kind === "lost") toast(t("toasts.deal_lost"));
      else toast.success(t("toasts.deal_moved", { stage: sn(stages.find((s) => s.id === stageId)?.name) }));
      router.refresh();
    });

  return (
    <div className={cn("rounded-[var(--radius-panel)] border border-line bg-surface p-4 shadow-1", pending && "opacity-70")}>
      <ol className="flex gap-1.5">
        {open.map((s, i) => {
          const reached = isClosed ? deal.stageKind === "won" : i <= currentIndex;
          const current = s.id === deal.stageId;
          return (
            <li key={s.id} className="min-w-0 flex-1">
              <button
                type="button"
                disabled={!editable || pending || current}
                onClick={() => move(s.id)}
                aria-current={current ? "step" : undefined}
                className={cn(
                  "group relative w-full overflow-hidden rounded-[10px] px-3 py-2.5 text-start transition",
                  reached ? "bg-primary-soft" : "bg-surface-3 hover:bg-line",
                  current && "ring-2 ring-primary",
                  "disabled:cursor-default",
                )}
              >
                {reached && <motion.span layoutId={`stage-fill-${deal.id}`} className="absolute inset-x-0 bottom-0 h-[3px] bg-primary" />}
                <span className={cn("block truncate text-xs font-semibold", reached ? "text-primary-strong" : "text-muted")}>{sn(s.name)}</span>
                <span className="tabular block text-[11px] text-muted">{s.probability}%</span>
              </button>
            </li>
          );
        })}
      </ol>
      {editable && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {isClosed ? (
            <Badge tone={deal.stageKind === "won" ? "jade" : "rose"} className="h-8 px-3">
              {deal.stageKind === "won" ? t("deals.statusWon") : `${t("deals.statusLost")}${deal.lostReason ? ` · ${lostReasonKey(deal.lostReason) ? t(`deals.lostReasons.${lostReasonKey(deal.lostReason)}`) : deal.lostReason}` : ""}`}
            </Badge>
          ) : (
            <>
              {won && (
                <Button size="sm" onClick={() => move(won.id)} disabled={pending}>
                  <Trophy />
                  {t("deals.markWon")}
                </Button>
              )}
              {lost && (
                <Button size="sm" variant="secondary" onClick={() => setLostOpen(true)} disabled={pending}>
                  <X />
                  {t("deals.markLost")}
                </Button>
              )}
            </>
          )}
          {isClosed && open[0] && (
            <Button size="sm" variant="ghost" onClick={() => move(open[open.length - 1]!.id)} disabled={pending}>
              <Check />
              {t("deals.statusOpen")}
            </Button>
          )}
        </div>
      )}
      <Dialog open={lostOpen} onOpenChange={setLostOpen}>
        <DialogContent title={t("deals.lostReasonTitle")} description={t("deals.lostReasonBody")} size="sm" closeLabel={t("common.close")}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const reason = String(new FormData(e.currentTarget).get("reason") ?? "");
              setLostOpen(false);
              if (lost) move(lost.id, reason);
            }}
          >
            <div className="px-6 py-5">
              <Field label={t("deals.lostReason")} htmlFor={`${p}r`}>
                <Select id={`${p}r`} name="reason" defaultValue={LOST_REASONS[0].value}>
                  {LOST_REASONS.map((r) => (
                    <option key={r.key} value={r.value}>
                      {t(`deals.lostReasons.${r.key}`)}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setLostOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" variant="danger">
                {t("deals.markLost")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
