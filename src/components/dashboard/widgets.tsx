"use client";

import { useCallback, useOptimistic, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useStageName } from "@/hooks/use-stage-name";
import { motion, useReducedMotion } from "motion/react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDownRight, ArrowUpRight, CalendarClock, Mail, Phone, Users as UsersIcon, ListTodo } from "lucide-react";
import { AnimatedNumber } from "@/components/shared/animated-number";
import { formatMoney, formatNumber, formatPercent, formatTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { Link } from "@/lib/i18n/navigation";
import { TONES, toneOf, toneVar, ACTIVITY_TONE } from "@/lib/utils/tones";
import { Avatar } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/field";
import { toggleActivityAction } from "@/server/actions/records";
import { toast } from "sonner";
import { useWorkspace } from "@/components/shared/workspace-context";
import type { DashboardData } from "@/server/queries/dashboard";

type Fmt = "money" | "percent" | "number";

function useFormatter(kind: Fmt) {
  const locale = useLocale();
  return useCallback(
    (n: number) => (kind === "money" ? formatMoney(n, locale, "USD", { compact: n >= 100_000 }) : kind === "percent" ? formatPercent(n / 100, locale) : formatNumber(n, locale)),
    [kind, locale],
  );
}

export function KpiCard({
  label,
  value,
  format,
  hint,
  delta,
  deltaLabel,
  accent,
  index,
}: {
  label: string;
  value: number;
  format: Fmt;
  hint?: string;
  delta?: number | null;
  deltaLabel?: string;
  accent?: boolean;
  index: number;
}) {
  const fmt = useFormatter(format);
  const locale = useLocale();
  const reduce = useReducedMotion();
  const up = (delta ?? 0) >= 0;
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 + index * 0.06, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "relative overflow-hidden rounded-[var(--radius-panel)] border p-5 shadow-1",
        accent ? "border-transparent bg-sidebar text-white" : "border-line bg-surface",
      )}
    >
      {accent && (
        <svg aria-hidden className="pointer-events-none absolute -end-10 -top-10 size-44 text-primary/25" viewBox="0 0 100 100" fill="none">
          <circle cx="50" cy="50" r="48" stroke="currentColor" strokeWidth="1" />
          <circle cx="50" cy="50" r="34" stroke="currentColor" strokeWidth="1" />
          <circle cx="50" cy="50" r="20" stroke="currentColor" strokeWidth="1" />
        </svg>
      )}
      <p className={cn("text-[13px] font-medium", accent ? "text-sidebar-ink" : "text-muted")}>{label}</p>
      <AnimatedNumber value={value} format={fmt} className="tabular mt-2 block text-[30px] font-semibold leading-none tracking-[-0.02em]" />
      <div className="mt-3 flex min-h-5 flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        {delta !== undefined && delta !== null && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium",
              up ? "bg-primary-soft text-primary-strong" : "bg-rose-soft text-rose",
              accent && (up ? "bg-primary/20 text-primary-strong" : "bg-rose/20 text-rose"),
            )}
          >
            {up ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
            {formatPercent(Math.abs(delta), locale)}
          </span>
        )}
        {(deltaLabel || hint) && <span className={accent ? "text-sidebar-muted" : "text-muted"}>{deltaLabel ?? hint}</span>}
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */

export function RevenueChart({ months }: { months: DashboardData["months"] }) {
  const locale = useLocale();
  const t = useTranslations("dashboard");
  const monthLabel = (key: string) => {
    const [y, m] = key.split("-").map(Number);
    return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG-u-nu-latn" : "en-US", { month: "short" }).format(new Date(y!, m! - 1, 1));
  };
  const data = months.map((m, i) => ({ ...m, label: monthLabel(m.month), current: i === months.length - 1 }));
  const rtl = locale === "ar";

  return (
    <div className="h-[280px] w-full" role="img" aria-label={t("revenueSubtitle")}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 0 }} barCategoryGap="22%">
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis dataKey="label" reversed={rtl} tickLine={false} axisLine={false} tick={{ fill: "var(--muted)", fontSize: 12 }} dy={6} />
          <YAxis
            orientation={rtl ? "right" : "left"}
            tickLine={false}
            axisLine={false}
            width={52}
            tick={{ fill: "var(--muted)", fontSize: 12 }}
            tickFormatter={(v: number) => formatMoney(v, locale, "USD", { compact: true })}
          />
          <Tooltip
            cursor={{ fill: "var(--surface-3)", radius: 8 }}
            content={({ active, payload }) => {
              const row = payload?.[0]?.payload as (typeof data)[number] | undefined;
              if (!active || !row) return null;
              return (
                <div className="rounded-xl border border-line bg-surface px-3 py-2 text-sm shadow-pop">
                  <p className="text-xs text-muted">{row.label}</p>
                  <p className="tabular mt-0.5 font-semibold text-ink">{formatMoney(row.won, locale)}</p>
                  <p className="text-xs text-muted">{t("deals", { count: row.deals })}</p>
                </div>
              );
            }}
          />
          <Bar dataKey="won" radius={[6, 6, 2, 2]} animationDuration={900} animationEasing="ease-out" maxBarSize={44}>
            {data.map((d) => (
              <Cell key={d.month} fill={d.current ? "var(--chart-1)" : "color-mix(in oklab, var(--chart-1) 38%, var(--surface))"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function StageBars({ stages }: { stages: DashboardData["byStage"] }) {
  const locale = useLocale();
  const t = useTranslations("dashboard");
  const sn = useStageName();
  const reduce = useReducedMotion();
  const open = stages.filter((s) => s.kind === "open");
  const max = Math.max(1, ...open.map((s) => s.value));
  return (
    <ul className="flex flex-col gap-4 px-5 pb-5">
      {open.map((stage, i) => {
        const tone = toneOf(stage.color);
        return (
          <li key={stage.id}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
              <span className="flex items-center gap-2 font-medium text-ink">
                <span className={cn("size-2 rounded-full", TONES[tone].dot)} aria-hidden />
                {sn(stage.name)}
              </span>
              <span className="tabular text-muted">
                <span className="font-semibold text-ink">{formatMoney(stage.value, locale, "USD", { compact: true })}</span> · {t("deals", { count: stage.count })}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-surface-3">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: toneVar(tone) }}
                initial={reduce ? false : { width: 0 }}
                animate={{ width: `${Math.max(3, (stage.value / max) * 100)}%` }}
                transition={{ delay: 0.15 + i * 0.08, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/* ------------------------------------------------------------------ */

export function SourceBars({ sources }: { sources: DashboardData["bySource"] }) {
  const t = useTranslations();
  const locale = useLocale();
  const reduce = useReducedMotion();
  const max = Math.max(1, ...sources.map((s) => s.total));
  return (
    <ul className="flex flex-col gap-3 px-5 pb-5">
      {sources.map((s, i) => (
        <li key={s.source} className="grid grid-cols-[7.5rem_1fr_auto] items-center gap-3 text-sm">
          <span className="truncate text-ink-2">{t(`enums.leadSource.${s.source}`)}</span>
          <div className="relative h-6 overflow-hidden rounded-md bg-surface-3">
            <motion.div
              className="absolute inset-y-0 start-0 rounded-md"
              style={{ backgroundColor: "color-mix(in oklab, var(--chart-2) 30%, var(--surface))" }}
              initial={reduce ? false : { width: 0 }}
              animate={{ width: `${(s.total / max) * 100}%` }}
              transition={{ delay: 0.1 + i * 0.05, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            />
            <motion.div
              className="absolute inset-y-0 start-0 rounded-md"
              style={{ backgroundColor: "var(--chart-2)" }}
              initial={reduce ? false : { width: 0 }}
              animate={{ width: `${(s.qualified / max) * 100}%` }}
              transition={{ delay: 0.25 + i * 0.05, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
          <span className="tabular w-20 text-end text-muted">
            <span className="font-semibold text-ink">{formatNumber(s.total, locale)}</span> · {formatNumber(s.qualified, locale)}
          </span>
        </li>
      ))}
      <li className="mt-1 flex items-center gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ backgroundColor: "color-mix(in oklab, var(--chart-2) 30%, var(--surface))" }} />
          {t("reports.total")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-[var(--chart-2)]" />
          {t("dashboard.qualified")}
        </span>
      </li>
    </ul>
  );
}

/* ------------------------------------------------------------------ */

export function Leaderboard({ rows }: { rows: DashboardData["leaderboard"] }) {
  const locale = useLocale();
  const t = useTranslations("dashboard");
  const max = Math.max(1, ...rows.map((r) => r.won));
  return (
    <ol className="flex flex-col gap-1 px-3 pb-4">
      {rows.map((r, i) => (
        <li key={r.id} className="flex items-center gap-3 rounded-xl px-2 py-2">
          <span className={cn("tabular w-5 text-center text-sm font-semibold", i === 0 ? "text-saffron" : "text-muted")}>{i + 1}</span>
          <Avatar name={r.name} hue={r.avatarHue} />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <p className="truncate text-sm font-medium text-ink">{r.name}</p>
              <p className="tabular text-sm font-semibold text-ink">{formatMoney(r.won, locale, "USD", { compact: true })}</p>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
                <div className="h-full rounded-full bg-primary transition-[width] duration-700" style={{ width: `${(r.won / max) * 100}%` }} />
              </div>
              <span className="text-xs text-muted">{t("deals", { count: r.count })}</span>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

/* ------------------------------------------------------------------ */

const ACTIVITY_ICON = { call: Phone, email: Mail, meeting: UsersIcon, task: ListTodo } as const;

export function Agenda({ items }: { items: DashboardData["agenda"] }) {
  const t = useTranslations();
  const locale = useLocale();
  const { openCreate } = useWorkspace();
  const [, start] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(items, (state, { id, done }: { id: string; done: boolean }) =>
    state.map((a) => (a.id === id ? { ...a, completedAt: done ? new Date() : null } : a)),
  );

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center px-6 pb-8 pt-4 text-center">
        <div className="mb-3 grid size-11 place-items-center rounded-2xl bg-primary-soft text-primary">
          <CalendarClock className="size-5" />
        </div>
        <p className="text-sm font-medium text-ink">{t("dashboard.agendaEmpty")}</p>
        <p className="mt-1 text-xs text-muted">{t("dashboard.agendaEmptyHint")}</p>
        <button type="button" onClick={() => openCreate("activity")} className="mt-4 text-sm font-medium text-primary hover:underline">
          {t("dashboard.planActivity")}
        </button>
      </div>
    );
  }

  return (
    <ul className="flex flex-col px-3 pb-3">
      {optimistic.map((a) => {
        const Icon = ACTIVITY_ICON[a.type];
        const tone = ACTIVITY_TONE[a.type];
        const done = Boolean(a.completedAt);
        return (
          <li key={a.id} className="group flex items-start gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-surface-2">
            <Checkbox
              className="mt-1"
              checked={done}
              aria-label={done ? t("activities.markUndone") : t("activities.markDone")}
              onChange={(e) => {
                const next = e.target.checked;
                start(async () => {
                  setOptimistic({ id: a.id, done: next });
                  const result = await toggleActivityAction(a.id, next);
                  if (!result.ok) toast.error(t.has(`errors.${result.error}`) ? t(`errors.${result.error}`) : t("errors.server_error"));
                });
              }}
            />
            <div className="min-w-0 flex-1">
              <p className={cn("truncate text-sm font-medium text-ink transition", done && "text-muted line-through")}>{a.subject}</p>
              {a.dealTitle && a.dealId && (
                <Link href={`/app/deals/${a.dealId}`} className="block truncate text-xs text-muted hover:text-primary">
                  {a.dealTitle}
                </Link>
              )}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <span className="tabular text-xs font-medium text-ink-2">{formatTime(a.dueAt, locale)}</span>
              <span className={cn("grid size-6 place-items-center rounded-full", TONES[tone].soft)} title={t(`enums.activityType.${a.type}`)}>
                <Icon className="size-3.5" />
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
