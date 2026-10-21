"use client";

import { useOptimistic, useRef, useState, useTransition, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { CalendarClock, ListTodo, Mail, Pencil, Phone, Plus, StickyNote, Trash, Users } from "lucide-react";
import { useRouter } from "@/lib/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Textarea, Checkbox } from "@/components/ui/field";
import { Avatar } from "@/components/ui/avatar";
import { Confirm } from "./confirm";
import { useWorkspace, type CreateKind } from "./workspace-context";
import { useAction } from "@/hooks/use-action";
import { addNoteAction, deleteActivityAction, deleteNoteAction, toggleActivityAction } from "@/server/actions/records";
import { ActivityForm, CompanyForm, ContactForm, DealForm, LeadForm } from "@/components/forms/record-forms";
import { formatDateTime, formatRelative } from "@/lib/utils/format";
import { ACTIVITY_TONE, TONES } from "@/lib/utils/tones";
import { cn } from "@/lib/utils/cn";
import type { ActionResult } from "@/lib/validation/result";

/* ------------------------------------------------------------------ */
/* Edit / delete actions for a record header                           */
/* ------------------------------------------------------------------ */

type Kind = "lead" | "contact" | "company" | "deal";
const FORMS = { lead: LeadForm, contact: ContactForm, company: CompanyForm, deal: DealForm } as const;
const LIST = { lead: "/app/leads", contact: "/app/contacts", company: "/app/companies", deal: "/app/deals" } as const;
const NS = { lead: "leads", contact: "contacts", company: "companies", deal: "deals" } as const;

export function RecordActions({
  kind,
  id,
  ownerId,
  initial,
  onDelete,
  canEdit = true,
  extra,
}: {
  kind: Kind;
  id: string;
  ownerId: string | null;
  initial: Record<string, string | number | null | undefined | string[]>;
  onDelete?: (id: string) => Promise<ActionResult<unknown>>;
  canEdit?: boolean;
  extra?: ReactNode;
}) {
  const t = useTranslations();
  const router = useRouter();
  const { canModify } = useWorkspace();
  const [editing, setEditing] = useState(false);
  const { run, pending } = useAction();
  const Form = FORMS[kind];
  const editable = canEdit && canModify(ownerId);
  const deletable = onDelete && canModify(ownerId, "delete") && (kind !== "company" || canModify(null, "delete"));

  return (
    <div className="flex flex-wrap items-center gap-2">
      {extra}
      {editable && (
        <Button variant="secondary" onClick={() => setEditing(true)}>
          <Pencil />
          {t("common.edit")}
        </Button>
      )}
      {deletable && (
        <Confirm
          trigger={
            <Button variant="danger-ghost" aria-label={t("common.delete")}>
              <Trash />
              <span className="hidden sm:inline">{t("common.delete")}</span>
            </Button>
          }
          title={t(`${NS[kind]}.deleteTitle`, { count: 1 })}
          description={t(`${NS[kind]}.deleteBody`)}
          pending={pending}
          onConfirm={() => run(() => onDelete(id), { onSuccess: () => router.replace(LIST[kind]) })}
        />
      )}
      {editing && <Form open onOpenChange={setEditing} id={id} initial={initial} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Definition list                                                     */
/* ------------------------------------------------------------------ */

export function InfoList({ items }: { items: Array<{ label: string; value: ReactNode; ltr?: boolean }> }) {
  return (
    <dl className="divide-y divide-line">
      {items.map((item) => (
        <div key={item.label} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-3 px-5 py-3 text-sm">
          <dt className="text-muted">{item.label}</dt>
          <dd className="min-w-0 break-words font-medium text-ink" dir={item.ltr ? "ltr" : undefined} style={item.ltr ? { textAlign: "start" } : undefined}>
            {item.value ?? "—"}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/* ------------------------------------------------------------------ */
/* Activity timeline                                                   */
/* ------------------------------------------------------------------ */

type TimelineItem = {
  id: string;
  type: "call" | "email" | "meeting" | "task";
  subject: string;
  description: string | null;
  dueAt: Date | null;
  completedAt: Date | null;
  ownerId: string | null;
  ownerName: string | null;
  ownerHue: number | null;
  dealId: string | null;
  contactId: string | null;
  companyId: string | null;
  leadId: string | null;
};

export const ACTIVITY_ICONS = { call: Phone, email: Mail, meeting: Users, task: ListTodo } as const;

export function Timeline({ items, defaults }: { items: TimelineItem[]; defaults: Partial<Record<"dealId" | "contactId" | "companyId" | "leadId", string>> }) {
  const t = useTranslations();
  const locale = useLocale();
  const { openCreate, canModify } = useWorkspace();
  const [editing, setEditing] = useState<TimelineItem | null>(null);
  const [now] = useState(() => Date.now());
  const [, start] = useTransition();
  const { run } = useAction();
  const [optimistic, update] = useOptimistic(items, (state, patch: { id: string; done?: boolean; removed?: boolean }) =>
    patch.removed ? state.filter((a) => a.id !== patch.id) : state.map((a) => (a.id === patch.id ? { ...a, completedAt: patch.done ? new Date() : null } : a)),
  );

  return (
    <div>
      <div className="flex items-center justify-between px-5 pb-2 pt-5">
        <h2 className="text-[15px] font-semibold tracking-tight">{t("activities.timeline")}</h2>
        <Button size="sm" variant="secondary" onClick={() => openCreate("activity" as CreateKind, defaults)}>
          <Plus />
          {t("activities.log")}
        </Button>
      </div>
      {optimistic.length === 0 ? (
        <div className="flex flex-col items-center px-6 py-10 text-center">
          <CalendarClock className="mb-2 size-6 text-muted" />
          <p className="text-sm text-muted">{t("activities.timelineEmpty")}</p>
        </div>
      ) : (
        <ol className="px-5 pb-5 pt-2">
          <AnimatePresence initial={false}>
            {optimistic.map((a, i) => {
              const Icon = ACTIVITY_ICONS[a.type];
              const done = Boolean(a.completedAt);
              const overdue = !done && a.dueAt && new Date(a.dueAt).getTime() < now;
              const editable = canModify(a.ownerId);
              return (
                <motion.li key={a.id} layout initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} className="relative flex gap-3.5 pb-5 last:pb-0">
                  {i < optimistic.length - 1 && <span aria-hidden className="absolute start-[15px] top-9 bottom-0 w-px bg-line" />}
                  <span className={cn("relative grid size-8 shrink-0 place-items-center rounded-full", TONES[ACTIVITY_TONE[a.type]].soft)}>
                    <Icon className="size-4" />
                  </span>
                  <div className="group min-w-0 flex-1 rounded-xl">
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <p className={cn("text-sm font-medium text-ink", done && "text-muted line-through")}>{a.subject}</p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
                          <span>{t(`enums.activityType.${a.type}`)}</span>
                          <span aria-hidden>·</span>
                          <span className={cn(overdue && "font-medium text-rose")}>{a.dueAt ? formatDateTime(a.dueAt, locale) : t("activities.noDue")}</span>
                          {a.ownerName && (
                            <>
                              <span aria-hidden>·</span>
                              <span>{a.ownerName}</span>
                            </>
                          )}
                        </p>
                        {a.description && <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{a.description}</p>}
                      </div>
                      {editable && (
                        <div className="flex shrink-0 items-center gap-1">
                          <Checkbox
                            checked={done}
                            aria-label={done ? t("activities.markUndone") : t("activities.markDone")}
                            onChange={(e) => {
                              const next = e.target.checked;
                              start(async () => {
                                update({ id: a.id, done: next });
                                const r = await toggleActivityAction(a.id, next);
                                if (!r.ok) toast.error(t("errors.server_error"));
                                else if (next) toast.success(t("toasts.activity_done"));
                              });
                            }}
                          />
                          <button type="button" onClick={() => setEditing(a)} className="grid size-7 place-items-center rounded-md text-muted opacity-0 transition hover:bg-surface-3 hover:text-ink focus:opacity-100 group-hover:opacity-100" aria-label={t("common.edit")}>
                            <Pencil className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              start(async () => {
                                update({ id: a.id, removed: true });
                                await run(() => deleteActivityAction(a.id));
                              })
                            }
                            className="grid size-7 place-items-center rounded-md text-muted opacity-0 transition hover:bg-rose-soft hover:text-rose focus:opacity-100 group-hover:opacity-100"
                            aria-label={t("common.delete")}
                          >
                            <Trash className="size-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ol>
      )}
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

/* ------------------------------------------------------------------ */
/* Notes                                                               */
/* ------------------------------------------------------------------ */

type NoteItem = { id: string; body: string; createdAt: Date; authorId: string | null; authorName: string | null; authorHue: number | null };

export function NotesPanel({ notes, entityType, entityId }: { notes: NoteItem[]; entityType: Kind; entityId: string }) {
  const t = useTranslations();
  const locale = useLocale();
  const { user, canModify } = useWorkspace();
  const { run, pending } = useAction();
  const ref = useRef<HTMLFormElement>(null);
  const [, start] = useTransition();
  const [optimistic, update] = useOptimistic(notes, (state, action: { add?: NoteItem; remove?: string }) =>
    action.add ? [action.add, ...state] : state.filter((n) => n.id !== action.remove),
  );

  return (
    <div className="px-5 pb-5 pt-5">
      <h2 className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
        <StickyNote className="size-4 text-muted" />
        {t("common.notes")}
      </h2>
      <form
        ref={ref}
        className="mt-3"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const body = String(fd.get("body") ?? "").trim();
          if (!body) return;
          fd.set("entityType", entityType);
          fd.set("entityId", entityId);
          start(async () => {
            update({ add: { id: `tmp-${Date.now()}`, body, createdAt: new Date(), authorId: user.id, authorName: user.name, authorHue: user.avatarHue } });
            const r = await run(() => addNoteAction(fd));
            if (r.ok) ref.current?.reset();
          });
        }}
      >
        <Textarea name="body" placeholder={t("notes.placeholder")} className="min-h-20" aria-label={t("notes.add")} maxLength={4000} />
        <div className="mt-2 flex justify-end">
          <Button size="sm" type="submit" loading={pending}>
            {t("notes.add")}
          </Button>
        </div>
      </form>
      {optimistic.length === 0 ? (
        <p className="mt-4 text-sm text-muted">{t("notes.empty")}</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {optimistic.map((n) => (
            <li key={n.id} className={cn("group rounded-xl border border-line bg-surface-2 p-3.5", n.id.startsWith("tmp-") && "opacity-60")}>
              <div className="mb-1.5 flex items-center gap-2 text-xs text-muted">
                <Avatar name={n.authorName ?? "?"} hue={n.authorHue} size="xs" />
                <span className="font-medium text-ink-2">{n.authorName}</span>
                <span>· {formatRelative(n.createdAt, locale)}</span>
                {canModify(n.authorId, "delete") && !n.id.startsWith("tmp-") && (
                  <button
                    type="button"
                    className="ms-auto grid size-6 place-items-center rounded-md opacity-0 transition hover:bg-rose-soft hover:text-rose focus:opacity-100 group-hover:opacity-100"
                    aria-label={t("common.delete")}
                    onClick={() =>
                      start(async () => {
                        update({ remove: n.id });
                        await run(() => deleteNoteAction(n.id));
                      })
                    }
                  >
                    <Trash className="size-3.5" />
                  </button>
                )}
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">{n.body}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
