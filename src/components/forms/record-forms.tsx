"use client";

import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useStageName } from "@/hooks/use-stage-name";
import { useRouter } from "@/lib/i18n/navigation";
import { Dialog, DialogContent, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { useWorkspace } from "@/components/shared/workspace-context";
import { useAction } from "@/hooks/use-action";
import {
  saveActivityAction,
  saveCompanyAction,
  saveContactAction,
  saveDealAction,
  saveLeadAction,
} from "@/server/actions/records";
import type { ActionResult } from "@/lib/validation/result";
import { cn } from "@/lib/utils/cn";

type Values = Record<string, string | number | null | undefined | string[]>;

const str = (v: Values[string]) => (v === null || v === undefined ? "" : Array.isArray(v) ? v.join(", ") : String(v));

/* ------------------------------------------------------------------ */
/* Shared shell                                                        */
/* ------------------------------------------------------------------ */

function FormSheet({
  open,
  onOpenChange,
  title,
  description,
  submitLabel,
  onSubmit,
  pending,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  submitLabel: string;
  onSubmit: (formData: FormData) => void;
  pending: boolean;
  children: ReactNode;
}) {
  const t = useTranslations("common");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent side="end" title={title} description={description} closeLabel={t("close")}>
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(new FormData(e.currentTarget));
          }}
          className="flex min-h-full flex-col"
        >
          <div className="grid flex-1 grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2">{children}</div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                {t("cancel")}
              </Button>
            </DialogClose>
            <Button type="submit" loading={pending}>
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function OwnerField({ value, error }: { value?: string; error?: string }) {
  const t = useTranslations("common");
  const { lookups, user, can } = useWorkspace();
  const id = useId();
  const canAssign = can("records:reassign");
  return (
    <Field label={t("owner")} htmlFor={id} error={error}>
      <Select id={id} name="ownerId" defaultValue={value || user.id} disabled={!canAssign}>
        {lookups.team.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
            {m.id === user.id ? ` (${t("me")})` : ""}
          </option>
        ))}
      </Select>
    </Field>
  );
}

function useSubmit<T extends { id: string }>(
  action: (id: string | null, fd: FormData) => Promise<ActionResult<T>>,
  id: string | null,
  onDone: (created: T) => void,
) {
  const { run, pending, fieldErrors } = useAction();
  const submit = (fd: FormData) => run(() => action(id, fd), { onSuccess: onDone });
  return { submit, pending, fieldErrors };
}

type FormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  id?: string | null;
  initial?: Values;
  /** Navigate to the created record after saving. */
  navigate?: boolean;
};

/* ------------------------------------------------------------------ */
/* Lead                                                                */
/* ------------------------------------------------------------------ */

export function LeadForm({ open, onOpenChange, id = null, initial = {}, navigate }: FormProps) {
  const t = useTranslations();
  const router = useRouter();
  const p = useId();
  const { submit, pending, fieldErrors: e } = useSubmit(saveLeadAction, id, (r) => {
    onOpenChange(false);
    if (navigate && !id) router.push(`/app/leads/${r.id}`);
  });
  const statuses = ["new", "contacted", "qualified", "unqualified"] as const;
  const sources = ["website", "referral", "linkedin", "cold_call", "event", "ads", "partner"] as const;
  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title={id ? t("leads.edit") : t("leads.new")} submitLabel={id ? t("common.saveChanges") : t("common.create")} onSubmit={submit} pending={pending}>
      <Field label={t("common.firstName")} htmlFor={`${p}fn`} error={e.firstName} required>
        <Input id={`${p}fn`} name="firstName" defaultValue={str(initial.firstName)} autoComplete="off" autoFocus />
      </Field>
      <Field label={t("common.lastName")} htmlFor={`${p}ln`} error={e.lastName} required>
        <Input id={`${p}ln`} name="lastName" defaultValue={str(initial.lastName)} autoComplete="off" />
      </Field>
      <Field label={t("common.email")} htmlFor={`${p}em`} error={e.email}>
        <Input id={`${p}em`} name="email" type="email" dir="ltr" defaultValue={str(initial.email)} />
      </Field>
      <Field label={t("common.phone")} htmlFor={`${p}ph`} error={e.phone}>
        <Input id={`${p}ph`} name="phone" type="tel" dir="ltr" defaultValue={str(initial.phone)} />
      </Field>
      <Field label={t("common.company")} htmlFor={`${p}co`} error={e.companyName}>
        <Input id={`${p}co`} name="companyName" defaultValue={str(initial.companyName)} />
      </Field>
      <Field label={t("common.jobTitle")} htmlFor={`${p}jt`} error={e.jobTitle}>
        <Input id={`${p}jt`} name="jobTitle" defaultValue={str(initial.jobTitle)} />
      </Field>
      <Field label={t("common.status")} htmlFor={`${p}st`} error={e.status}>
        <Select id={`${p}st`} name="status" defaultValue={str(initial.status) || "new"}>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {t(`enums.leadStatus.${s}`)}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t("common.source")} htmlFor={`${p}so`} error={e.source}>
        <Select id={`${p}so`} name="source" defaultValue={str(initial.source) || "website"}>
          {sources.map((s) => (
            <option key={s} value={s}>
              {t(`enums.leadSource.${s}`)}
            </option>
          ))}
        </Select>
      </Field>
      <ScoreField defaultValue={Number(initial.score ?? 30)} error={e.score} />
      <Field label={t("leads.estimatedValue")} htmlFor={`${p}ev`} error={e.estimatedValue}>
        <Input id={`${p}ev`} name="estimatedValue" inputMode="numeric" dir="ltr" defaultValue={str(initial.estimatedValue)} placeholder="0" />
      </Field>
      <OwnerField value={str(initial.ownerId)} error={e.ownerId} />
      <Field label={t("leads.notesLabel")} htmlFor={`${p}no`} error={e.notes} className="sm:col-span-2">
        <Textarea id={`${p}no`} name="notes" defaultValue={str(initial.notes)} />
      </Field>
    </FormSheet>
  );
}

function ScoreField({ defaultValue, error }: { defaultValue: number; error?: string }) {
  const t = useTranslations("leads");
  const id = useId();
  const [value, setValue] = useState(defaultValue);
  const tone = value >= 70 ? "accent-[var(--primary)]" : value >= 40 ? "accent-[var(--saffron)]" : "accent-[var(--slate)]";
  return (
    <Field label={`${t("score")} · ${value}`} htmlFor={id} hint={t("scoreHint")} error={error}>
      <input id={id} name="score" type="range" min={0} max={100} step={1} value={value} onChange={(e) => setValue(Number(e.target.value))} className={cn("h-10 w-full cursor-pointer", tone)} />
    </Field>
  );
}

/* ------------------------------------------------------------------ */
/* Contact                                                             */
/* ------------------------------------------------------------------ */

export function ContactForm({ open, onOpenChange, id = null, initial = {}, navigate }: FormProps) {
  const t = useTranslations();
  const router = useRouter();
  const { lookups } = useWorkspace();
  const p = useId();
  const { submit, pending, fieldErrors: e } = useSubmit(saveContactAction, id, (r) => {
    onOpenChange(false);
    if (navigate && !id) router.push(`/app/contacts/${r.id}`);
  });
  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title={id ? t("contacts.edit") : t("contacts.new")} submitLabel={id ? t("common.saveChanges") : t("common.create")} onSubmit={submit} pending={pending}>
      <Field label={t("common.firstName")} htmlFor={`${p}fn`} error={e.firstName} required>
        <Input id={`${p}fn`} name="firstName" defaultValue={str(initial.firstName)} autoFocus />
      </Field>
      <Field label={t("common.lastName")} htmlFor={`${p}ln`} error={e.lastName} required>
        <Input id={`${p}ln`} name="lastName" defaultValue={str(initial.lastName)} />
      </Field>
      <Field label={t("common.email")} htmlFor={`${p}em`} error={e.email}>
        <Input id={`${p}em`} name="email" type="email" dir="ltr" defaultValue={str(initial.email)} />
      </Field>
      <Field label={t("common.phone")} htmlFor={`${p}ph`} error={e.phone}>
        <Input id={`${p}ph`} name="phone" type="tel" dir="ltr" defaultValue={str(initial.phone)} />
      </Field>
      <Field label={t("common.company")} htmlFor={`${p}co`} error={e.companyId}>
        <Select id={`${p}co`} name="companyId" defaultValue={str(initial.companyId)}>
          <option value="">{t("contacts.noCompany")}</option>
          {lookups.companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t("common.jobTitle")} htmlFor={`${p}jt`} error={e.jobTitle}>
        <Input id={`${p}jt`} name="jobTitle" defaultValue={str(initial.jobTitle)} />
      </Field>
      <Field label={t("contacts.lifecycle")} htmlFor={`${p}lc`} error={e.lifecycle}>
        <Select id={`${p}lc`} name="lifecycle" defaultValue={str(initial.lifecycle) || "lead"}>
          {(["lead", "opportunity", "customer", "churned"] as const).map((s) => (
            <option key={s} value={s}>
              {t(`enums.lifecycle.${s}`)}
            </option>
          ))}
        </Select>
      </Field>
      <OwnerField value={str(initial.ownerId)} error={e.ownerId} />
      <Field label={t("contacts.tags")} htmlFor={`${p}tg`} hint={t("contacts.tagsHint")} error={e.tags} className="sm:col-span-2">
        <Input id={`${p}tg`} name="tags" defaultValue={str(initial.tags)} />
      </Field>
    </FormSheet>
  );
}

/* ------------------------------------------------------------------ */
/* Company                                                             */
/* ------------------------------------------------------------------ */

const INDUSTRIES = [
  "Automotive", "Education", "Energy", "Financial Services", "Food & Beverage", "Healthcare", "Hospitality",
  "Logistics", "Manufacturing", "Media", "Real Estate", "Retail", "Technology", "Telecommunications",
];
const SIZES = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"];

export function CompanyForm({ open, onOpenChange, id = null, initial = {}, navigate }: FormProps) {
  const t = useTranslations();
  const router = useRouter();
  const p = useId();
  const { submit, pending, fieldErrors: e } = useSubmit(saveCompanyAction, id, (r) => {
    onOpenChange(false);
    if (navigate && !id) router.push(`/app/companies/${r.id}`);
  });
  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title={id ? t("companies.edit") : t("companies.new")} submitLabel={id ? t("common.saveChanges") : t("common.create")} onSubmit={submit} pending={pending}>
      <Field label={t("common.name")} htmlFor={`${p}nm`} error={e.name} required className="sm:col-span-2">
        <Input id={`${p}nm`} name="name" defaultValue={str(initial.name)} autoFocus />
      </Field>
      <Field label={t("companies.domain")} htmlFor={`${p}dm`} error={e.domain}>
        <Input id={`${p}dm`} name="domain" dir="ltr" placeholder="acme.com" defaultValue={str(initial.domain)} />
      </Field>
      <Field label={t("common.phone")} htmlFor={`${p}ph`} error={e.phone}>
        <Input id={`${p}ph`} name="phone" type="tel" dir="ltr" defaultValue={str(initial.phone)} />
      </Field>
      <Field label={t("companies.industry")} htmlFor={`${p}in`} error={e.industry}>
        <Select id={`${p}in`} name="industry" defaultValue={str(initial.industry)}>
          <option value="">—</option>
          {INDUSTRIES.map((i) => (
            <option key={i} value={i}>
              {i}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t("companies.size")} htmlFor={`${p}sz`} error={e.size}>
        <Select id={`${p}sz`} name="size" defaultValue={str(initial.size)}>
          <option value="">—</option>
          {SIZES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t("companies.country")} htmlFor={`${p}ct`} error={e.country}>
        <Input id={`${p}ct`} name="country" defaultValue={str(initial.country)} />
      </Field>
      <Field label={t("companies.city")} htmlFor={`${p}ci`} error={e.city}>
        <Input id={`${p}ci`} name="city" defaultValue={str(initial.city)} />
      </Field>
      <Field label={t("companies.annualRevenue")} htmlFor={`${p}ar`} error={e.annualRevenue}>
        <Input id={`${p}ar`} name="annualRevenue" inputMode="numeric" dir="ltr" defaultValue={str(initial.annualRevenue)} placeholder="0" />
      </Field>
      <OwnerField value={str(initial.ownerId)} error={e.ownerId} />
    </FormSheet>
  );
}

/* ------------------------------------------------------------------ */
/* Deal                                                                */
/* ------------------------------------------------------------------ */

export function DealForm({ open, onOpenChange, id = null, initial = {}, navigate }: FormProps) {
  const t = useTranslations();
  const router = useRouter();
  const { lookups } = useWorkspace();
  const sn = useStageName();
  const p = useId();
  const [companyId, setCompanyId] = useState(str(initial.companyId));
  const contactOptions = useMemo(
    () => (companyId ? lookups.contacts.filter((c) => c.companyId === companyId) : lookups.contacts),
    [companyId, lookups.contacts],
  );
  const firstOpen = lookups.stages.find((s) => s.kind === "open");
  const { submit, pending, fieldErrors: e } = useSubmit(saveDealAction, id, (r) => {
    onOpenChange(false);
    if (navigate && !id) router.push(`/app/deals/${r.id}`);
  });
  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title={id ? t("deals.edit") : t("deals.new")} submitLabel={id ? t("common.saveChanges") : t("common.create")} onSubmit={submit} pending={pending}>
      <Field label={t("deals.dealTitle")} htmlFor={`${p}ti`} error={e.title} required className="sm:col-span-2">
        <Input id={`${p}ti`} name="title" defaultValue={str(initial.title)} autoFocus />
      </Field>
      <Field label={t("common.value")} htmlFor={`${p}va`} error={e.value}>
        <Input id={`${p}va`} name="value" inputMode="numeric" dir="ltr" defaultValue={str(initial.value)} placeholder="0" />
      </Field>
      <Field label={t("deals.stage")} htmlFor={`${p}st`} error={e.stageId} required>
        <Select id={`${p}st`} name="stageId" defaultValue={str(initial.stageId) || firstOpen?.id}>
          {lookups.stages.map((s) => (
            <option key={s.id} value={s.id}>
              {sn(s.name)} · {s.probability}%
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t("common.company")} htmlFor={`${p}co`} error={e.companyId}>
        <Select id={`${p}co`} name="companyId" value={companyId} onChange={(ev) => setCompanyId(ev.target.value)}>
          <option value="">{t("contacts.noCompany")}</option>
          {lookups.companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t("deals.contact")} htmlFor={`${p}ct`} error={e.contactId}>
        <Select id={`${p}ct`} name="contactId" defaultValue={str(initial.contactId)} key={companyId}>
          <option value="">{t("deals.noContact")}</option>
          {contactOptions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t("deals.priority")} htmlFor={`${p}pr`} error={e.priority}>
        <Select id={`${p}pr`} name="priority" defaultValue={str(initial.priority) || "medium"}>
          {(["low", "medium", "high"] as const).map((s) => (
            <option key={s} value={s}>
              {t(`enums.priority.${s}`)}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t("deals.expectedClose")} htmlFor={`${p}cd`} error={e.expectedCloseDate}>
        <Input id={`${p}cd`} name="expectedCloseDate" type="date" defaultValue={str(initial.expectedCloseDate)} />
      </Field>
      <OwnerField value={str(initial.ownerId)} error={e.ownerId} />
    </FormSheet>
  );
}

/* ------------------------------------------------------------------ */
/* Activity                                                            */
/* ------------------------------------------------------------------ */

function toLocalInput(value: string | number | null | undefined | string[]) {
  if (!value || Array.isArray(value)) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultDue() {
  const d = new Date(Date.now() + 86_400_000);
  d.setHours(10, 0, 0, 0);
  return d.toISOString();
}

export function ActivityForm({ open, onOpenChange, id = null, initial = {} }: FormProps) {
  const t = useTranslations();
  const { lookups } = useWorkspace();
  const p = useId();
  const { run, pending, fieldErrors: e } = useAction();
  const deals = useDealOptions();
  const submit = (fd: FormData) => {
    // datetime-local has no zone; convert to an absolute ISO timestamp in the browser's zone.
    const local = fd.get("dueAt");
    if (typeof local === "string" && local) fd.set("dueAt", new Date(local).toISOString());
    return run(() => saveActivityAction(id, fd), { onSuccess: () => onOpenChange(false) });
  };
  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title={id ? t("activities.edit") : t("activities.new")} submitLabel={id ? t("common.saveChanges") : t("common.create")} onSubmit={submit} pending={pending}>
      <fieldset className="sm:col-span-2">
        <legend className="mb-1.5 text-[13px] font-medium text-ink-2">{t("activities.type")}</legend>
        <TypePicker defaultValue={str(initial.type) || "call"} />
      </fieldset>
      <Field label={t("activities.subject")} htmlFor={`${p}su`} error={e.subject} required className="sm:col-span-2">
        <Input id={`${p}su`} name="subject" defaultValue={str(initial.subject)} autoFocus />
      </Field>
      <Field label={t("activities.dueAt")} htmlFor={`${p}du`} error={e.dueAt}>
        <Input id={`${p}du`} name="dueAt" type="datetime-local" defaultValue={toLocalInput(initial.dueAt ?? (id ? null : defaultDue()))} />
      </Field>
      <OwnerField value={str(initial.ownerId)} error={e.ownerId} />
      <Field label={t("activities.deal")} htmlFor={`${p}de`} error={e.dealId} className="sm:col-span-2">
        <Select id={`${p}de`} name="dealId" defaultValue={str(initial.dealId)}>
          <option value="">{t("activities.noDeal")}</option>
          {deals.map((d) => (
            <option key={d.id} value={d.id}>
              {d.title}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t("deals.contact")} htmlFor={`${p}ct`} error={e.contactId}>
        <Select id={`${p}ct`} name="contactId" defaultValue={str(initial.contactId)}>
          <option value="">{t("deals.noContact")}</option>
          {lookups.contacts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t("common.company")} htmlFor={`${p}co`} error={e.companyId}>
        <Select id={`${p}co`} name="companyId" defaultValue={str(initial.companyId)}>
          <option value="">{t("contacts.noCompany")}</option>
          {lookups.companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>
      {initial.leadId ? <input type="hidden" name="leadId" value={str(initial.leadId)} /> : null}
      <Field label={t("activities.description")} htmlFor={`${p}ds`} error={e.description} className="sm:col-span-2">
        <Textarea id={`${p}ds`} name="description" defaultValue={str(initial.description)} />
      </Field>
    </FormSheet>
  );
}

function TypePicker({ defaultValue }: { defaultValue: string }) {
  const t = useTranslations("enums.activityType");
  const [value, setValue] = useState(defaultValue);
  const types = ["call", "email", "meeting", "task"] as const;
  return (
    <div role="radiogroup" className="grid grid-cols-4 gap-1 rounded-[var(--radius-control)] bg-surface-3 p-1">
      {types.map((type) => (
        <label
          key={type}
          className={cn(
            "flex h-8 cursor-pointer items-center justify-center rounded-[8px] text-[13px] font-medium text-muted transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary",
            value === type && "bg-surface text-ink shadow-1",
          )}
        >
          <input type="radio" name="type" value={type} checked={value === type} onChange={() => setValue(type)} className="sr-only" />
          {t(type)}
        </label>
      ))}
    </div>
  );
}

/** Deal options are not part of the global lookups (they change often) — fetch lazily. */
function useDealOptions() {
  const [deals, setDeals] = useState<Array<{ id: string; title: string }>>([]);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/options/deals", { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: Array<{ id: string; title: string }>) => setDeals(rows))
      .catch(() => undefined);
    return () => controller.abort();
  }, []);
  return deals;
}

/* ------------------------------------------------------------------ */
/* Global create host                                                  */
/* ------------------------------------------------------------------ */

export function CreateHost() {
  const { create, closeCreate } = useWorkspace();
  const onOpenChange = (open: boolean) => {
    if (!open) closeCreate();
  };
  if (!create) return null;
  const props = { open: true, onOpenChange, initial: create.defaults ?? {}, navigate: true };
  switch (create.kind) {
    case "lead":
      return <LeadForm {...props} />;
    case "contact":
      return <ContactForm {...props} />;
    case "company":
      return <CompanyForm {...props} />;
    case "deal":
      return <DealForm {...props} />;
    case "activity":
      return <ActivityForm {...props} />;
  }
}
