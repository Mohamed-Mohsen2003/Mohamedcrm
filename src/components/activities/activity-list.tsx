"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { CalendarCheck, Pencil } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { Checkbox } from "@/components/ui/field";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { ActivityForm } from "@/components/forms/record-forms";
import { ACTIVITY_ICONS } from "@/components/shared/record-parts";
import { useWorkspace } from "@/components/shared/workspace-context";
import { toggleActivityAction } from "@/server/actions/records";
import { formatDate, formatTime } from "@/lib/utils/format";
import { ACTIVITY_TONE, TONES } from "@/lib/utils/tones";
import { cn } from "@/lib/utils/cn";
import type { ActivityRow, ActivityView } from "@/server/queries/records";

function dayKey(d: Date | null) {
  if (!d) return "none";
  const x = new Date(d);
  return `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`;
}

export function ActivityList({ rows, view }: { rows: ActivityRow[]; view: ActivityView }) {
  const t = useTranslations();
  const locale = useLocale();
  const { canModify, openCreate } = useWorkspace();
  const [editing, setEditing] = useState<ActivityRow | null>(null);
  const [now] = useState(() => Date.now());
  const [, start] = useTransition();
  const [items, update] = useOptimistic(rows, (state, patch: { id: string; done: boolean }) =>
    state.map((a) => (a.id === patch.id ? { ...a, completedAt: patch.done ? new Date() : null } : a)),
  );

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<CalendarCheck />}
        title={t(`activities.empty.${view}`)}
        description={t("activities.emptyHint")}
        action={<Button onClick={() => openCreate("activity")}>{t("activities.new")}</Button>}
      />
    );
  }

  // Group consecutive items by calendar day.
  const groups: Array<{ key: string; date: Date | null; items: ActivityRow[] }> = [];
  for (const a of items) {
    const ref = view === "completed" ? a.completedAt : a.dueAt;
    const key = dayKey(ref);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(a);
    else groups.push({ key, date: ref, items: [a] });
  }
  const todayKey = dayKey(new Date());

  return (
    <div className="divide-y divide-line">
      {groups.map((g) => (
        <section key={g.key + g.items[0]!.id}>
          <h3 className="bg-surface-2/70 px-5 py-2 text-xs font-semibold text-muted">
            {g.key === todayKey ? t("common.today") : g.date ? formatDate(g.date, locale, { weekday: "long", day: "numeric", month: "long" }) : t("activities.noDue")}
          </h3>
          <ul>
            <AnimatePresence initial={false}>
              {g.items.map((a) => {
                const Icon = ACTIVITY_ICONS[a.type];
                const done = Boolean(a.completedAt);
                const overdue = !done && a.dueAt && new Date(a.dueAt).getTime() < now;
                const editable = canModify(a.ownerId);
                const related = a.dealId
                  ? { href: `/app/deals/${a.dealId}`, label: a.dealTitle }
                  : a.contactId
                    ? { href: `/app/contacts/${a.contactId}`, label: `${a.contactFirstName} ${a.contactLastName}` }
                    : a.leadId
                      ? { href: `/app/leads/${a.leadId}`, label: `${a.leadFirstName} ${a.leadLastName}` }
                      : a.companyId
                        ? { href: `/app/companies/${a.companyId}`, label: a.companyName }
                        : null;
                return (
                  <motion.li key={a.id} layout="position" className="group flex items-center gap-4 px-5 py-3 transition-colors hover:bg-surface-2">
                    <Checkbox
                      checked={done}
                      disabled={!editable}
                      aria-label={done ? t("activities.markUndone") : t("activities.markDone")}
                      onChange={(e) => {
                        const next = e.target.checked;
                        start(async () => {
                          update({ id: a.id, done: next });
                          const r = await toggleActivityAction(a.id, next);
                          if (!r.ok) toast.error(t.has(`errors.${r.error}`) ? t(`errors.${r.error}`) : t("errors.server_error"));
                          else if (next) toast.success(t("toasts.activity_done"));
                        });
                      }}
                    />
                    <span className={cn("grid size-9 shrink-0 place-items-center rounded-full", TONES[ACTIVITY_TONE[a.type]].soft)}>
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={cn("truncate text-sm font-medium text-ink", done && "text-muted line-through")}>{a.subject}</p>
                      <p className="mt-0.5 flex min-w-0 items-center gap-2 text-xs text-muted">
                        <span>{t(`enums.activityType.${a.type}`)}</span>
                        {related?.label && (
                          <>
                            <span aria-hidden>·</span>
                            <Link href={related.href} className="truncate hover:text-primary">
                              {related.label}
                            </Link>
                          </>
                        )}
                      </p>
                    </div>
                    <div className="hidden items-center gap-2 text-xs text-muted sm:flex">
                      {a.ownerName && <Avatar name={a.ownerName} hue={a.ownerHue} size="xs" />}
                    </div>
                    <span className={cn("tabular w-20 shrink-0 text-end text-sm", overdue ? "font-medium text-rose" : "text-ink-2")}>
                      {a.dueAt ? (view === "overdue" ? formatDate(a.dueAt, locale, { day: "numeric", month: "short" }) : formatTime(a.dueAt, locale)) : "—"}
                    </span>
                    {editable && (
                      <button type="button" onClick={() => setEditing(a)} className="grid size-8 shrink-0 place-items-center rounded-md text-muted opacity-0 transition hover:bg-surface-3 hover:text-ink focus:opacity-100 group-hover:opacity-100" aria-label={t("common.edit")}>
                        <Pencil className="size-4" />
                      </button>
                    )}
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        </section>
      ))}
      {editing && (
        <ActivityForm
          open
          onOpenChange={(o) => !o && setEditing(null)}
          id={editing.id}
          initial={{
            type: editing.type,
            subject: editing.subject,
            description: editing.description,
            dueAt: editing.dueAt ? new Date(editing.dueAt).toISOString() : null,
            ownerId: editing.ownerId,
            dealId: editing.dealId,
            contactId: editing.contactId,
            companyId: editing.companyId,
            leadId: editing.leadId,
          }}
        />
      )}
    </div>
  );
}
