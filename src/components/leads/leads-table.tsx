"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AnimatePresence, motion } from "motion/react";
import { CircleCheck, Magnet, Trash, UserCog, X } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { EmptyState, ScoreRing } from "@/components/ui/misc";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@/components/ui/menu";
import { Confirm } from "@/components/shared/confirm";
import { SortHeader } from "@/components/shared/list-controls";
import { useWorkspace } from "@/components/shared/workspace-context";
import { useAction } from "@/hooks/use-action";
import { assignLeadsAction, deleteLeadsAction, setLeadStatusAction } from "@/server/actions/records";
import { formatMoney, formatRelative } from "@/lib/utils/format";
import { LEAD_STATUS_TONE } from "@/lib/utils/tones";
import type { listLeads } from "@/server/queries/records";

type Row = Awaited<ReturnType<typeof listLeads>>["rows"][number];

export function LeadsTable({ rows, filtered }: { rows: Row[]; filtered: boolean }) {
  const t = useTranslations();
  const locale = useLocale();
  const { can, canModify, lookups, openCreate } = useWorkspace();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { run, pending } = useAction();

  const visibleIds = useMemo(() => rows.map((r) => r.id), [rows]);
  const selectedIds = visibleIds.filter((id) => selected.has(id));
  const allChecked = selectedIds.length > 0 && selectedIds.length === visibleIds.length;
  const selectedRows = rows.filter((r) => selected.has(r.id));
  const canDeleteSelected = selectedRows.every((r) => canModify(r.ownerId, "delete"));
  const canEditSelected = selectedRows.every((r) => canModify(r.ownerId));

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (rows.length === 0) {
    return filtered ? (
      <EmptyState icon={<Magnet />} title={t("common.noResults")} description={t("common.noResultsHint")} />
    ) : (
      <EmptyState
        icon={<Magnet />}
        title={t("leads.empty")}
        description={t("leads.emptyHint")}
        action={<Button onClick={() => openCreate("lead")}>{t("leads.new")}</Button>}
      />
    );
  }

  return (
    <div className="relative">
      <div className="scrollbar-thin overflow-x-auto">
        <table className="w-full min-w-[980px] text-sm [&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
          <thead className="border-b border-line bg-surface-2/60 text-xs text-muted">
            <tr>
              <th scope="col" className="w-12 px-4 py-3">
                <Checkbox
                  checked={allChecked}
                  ref={(el) => {
                    if (el) el.indeterminate = selectedIds.length > 0 && !allChecked;
                  }}
                  onChange={() => setSelected(allChecked ? new Set() : new Set(visibleIds))}
                  aria-label={t("common.all")}
                />
              </th>
              <SortHeader column="name">{t("common.name")}</SortHeader>
              <SortHeader column="company">{t("common.company")}</SortHeader>
              <SortHeader column="status">{t("common.status")}</SortHeader>
              <th scope="col" className="px-4 py-3 text-start font-medium">
                {t("common.source")}
              </th>
              <SortHeader column="score">{t("leads.score")}</SortHeader>
              <SortHeader column="value" className="text-end">
                {t("leads.estimatedValue")}
              </SortHeader>
              <th scope="col" className="px-4 py-3 text-start font-medium">
                {t("common.owner")}
              </th>
              <SortHeader column="created">{t("common.created")}</SortHeader>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => {
              const isSelected = selected.has(r.id);
              return (
                <tr key={r.id} className={isSelected ? "bg-primary-soft/40" : "transition-colors hover:bg-surface-2"}>
                  <td className="px-4 py-3">
                    <Checkbox checked={isSelected} onChange={() => toggle(r.id)} aria-label={`${r.firstName} ${r.lastName}`} />
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/app/leads/${r.id}`} className="group flex flex-col">
                      <span className="font-medium text-ink group-hover:text-primary">
                        {r.firstName} {r.lastName}
                      </span>
                      <span className="text-xs text-muted" dir="ltr">
                        {r.email}
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className="block text-ink-2">{r.companyName ?? "—"}</span>
                    <span className="block text-xs text-muted">{r.jobTitle}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={LEAD_STATUS_TONE[r.status]}>{t(`enums.leadStatus.${r.status}`)}</Badge>
                  </td>
                  <td className="px-4 py-3 text-ink-2">{t(`enums.leadSource.${r.source}`)}</td>
                  <td className="px-4 py-3">
                    <ScoreRing value={r.score} />
                  </td>
                  <td className="tabular px-4 py-3 text-end font-medium text-ink">{formatMoney(r.estimatedValue, locale)}</td>
                  <td className="px-4 py-3">
                    {r.ownerName ? (
                      <span className="flex items-center gap-2 text-ink-2">
                        <Avatar name={r.ownerName} hue={r.ownerHue} size="xs" />
                        <span className="truncate">{r.ownerName}</span>
                      </span>
                    ) : (
                      <span className="text-muted">{t("common.unassigned")}</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted">{formatRelative(r.createdAt, locale)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="fixed inset-x-0 bottom-6 z-40 mx-auto flex w-fit max-w-[calc(100vw-2rem)] items-center gap-1.5 rounded-full border border-line bg-ink p-1.5 ps-4 text-bg shadow-pop"
            role="toolbar"
            aria-label={t("common.actions")}
          >
            <span className="tabular me-2 text-sm font-medium">{t("common.selected", { count: selectedIds.length })}</span>
            <Menu>
              <MenuTrigger asChild>
                <Button size="sm" variant="ghost" className="rounded-full text-bg hover:bg-bg/10 hover:text-bg" disabled={!canEditSelected || pending}>
                  <CircleCheck />
                  {t("leads.setStatus")}
                </Button>
              </MenuTrigger>
              <MenuContent align="center" side="top">
                {(["new", "contacted", "qualified", "unqualified"] as const).map((s) => (
                  <MenuItem key={s} onSelect={() => run(() => setLeadStatusAction(selectedIds, s), { onSuccess: () => setSelected(new Set()) })}>
                    <Badge tone={LEAD_STATUS_TONE[s]}>{t(`enums.leadStatus.${s}`)}</Badge>
                  </MenuItem>
                ))}
              </MenuContent>
            </Menu>
            {can("records:reassign") && (
              <Menu>
                <MenuTrigger asChild>
                  <Button size="sm" variant="ghost" className="rounded-full text-bg hover:bg-bg/10 hover:text-bg" disabled={pending}>
                    <UserCog />
                    {t("leads.assignTo")}
                  </Button>
                </MenuTrigger>
                <MenuContent align="center" side="top" className="max-h-72 overflow-y-auto">
                  {lookups.team.map((m) => (
                    <MenuItem key={m.id} onSelect={() => run(() => assignLeadsAction(selectedIds, m.id), { onSuccess: () => setSelected(new Set()) })}>
                      <Avatar name={m.name} hue={m.avatarHue} size="xs" />
                      {m.name}
                    </MenuItem>
                  ))}
                </MenuContent>
              </Menu>
            )}
            {canDeleteSelected && (
              <Confirm
                trigger={
                  <Button size="sm" variant="ghost" className="rounded-full text-rose hover:bg-rose/15 hover:text-rose" disabled={pending}>
                    <Trash />
                    {t("common.delete")}
                  </Button>
                }
                title={t("leads.deleteTitle", { count: selectedIds.length })}
                description={t("leads.deleteBody")}
                pending={pending}
                onConfirm={() => run(() => deleteLeadsAction(selectedIds), { onSuccess: () => setSelected(new Set()) })}
              />
            )}
            <button type="button" onClick={() => setSelected(new Set())} className="grid size-8 place-items-center rounded-full hover:bg-bg/10" aria-label={t("common.clear")}>
              <X className="size-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
