"use client";

import { useLocale, useTranslations } from "next-intl";
import { useStageName } from "@/hooks/use-stage-name";
import { motion, useReducedMotion } from "motion/react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Avatar } from "@/components/ui/avatar";
import { formatMoney, formatNumber, formatPercent } from "@/lib/utils/format";
import { ACTIVITY_TONE, TONES, toneOf, toneVar } from "@/lib/utils/tones";
import { lostReasonKey } from "@/lib/utils/lost-reasons";
import { cn } from "@/lib/utils/cn";
import type { ReportsData } from "@/server/queries/insights";

const ease = [0.16, 1, 0.3, 1] as const;

function Bar1({ pct, color, delay = 0 }: { pct: number; color: string; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <div className="h-2 overflow-hidden rounded-full bg-surface-3">
      <motion.div className="h-full rounded-full" style={{ backgroundColor: color }} initial={reduce ? false : { width: 0 }} animate={{ width: `${Math.max(pct, pct > 0 ? 2 : 0)}%` }} transition={{ duration: 0.8, delay, ease }} />
    </div>
  );
}

export function RepBars({ rows }: { rows: ReportsData["byOwner"] }) {
  const locale = useLocale();
  const t = useTranslations("reports");
  const max = Math.max(1, ...rows.map((r) => r.won));
  return (
    <ul className="flex flex-col gap-4 px-5 pb-5">
      {rows.map((r, i) => {
        const decided = r.wonCount + r.lostCount;
        return (
          <li key={r.id} className="flex items-center gap-3">
            <Avatar name={r.name} hue={r.avatarHue} />
            <div className="min-w-0 flex-1">
              <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
                <span className="truncate font-medium text-ink">{r.name}</span>
                <span className="tabular shrink-0 text-muted">
                  <span className="font-semibold text-ink">{formatMoney(r.won, locale, "USD", { compact: true })}</span>
                  {decided > 0 && ` · ${formatPercent(r.wonCount / decided, locale)} ${t("winRate").toLowerCase()}`}
                </span>
              </div>
              <Bar1 pct={(r.won / max) * 100} color="var(--chart-1)" delay={i * 0.05} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function LossReasons({ rows }: { rows: ReportsData["lostReasons"] }) {
  const t = useTranslations("reports");
  const td = useTranslations("deals.lostReasons");
  const locale = useLocale();
  const total = rows.reduce((s, r) => s + r.count, 0);
  if (!total) return <p className="px-5 pb-6 text-sm text-muted">{t("noData")}</p>;
  return (
    <ul className="flex flex-col gap-3.5 px-5 pb-5">
      {rows.map((r, i) => {
        const key = lostReasonKey(r.reason);
        return (
          <li key={r.reason ?? "none"}>
            <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
              <span className="text-ink-2">{key ? td(key) : r.reason ?? t("noReason")}</span>
              <span className="tabular text-muted">
                <span className="font-semibold text-ink">{formatNumber(r.count, locale)}</span> · {formatPercent(r.count / total, locale)}
              </span>
            </div>
            <Bar1 pct={(r.count / total) * 100} color="var(--chart-5)" delay={i * 0.05} />
          </li>
        );
      })}
    </ul>
  );
}

export function SourceFunnel({ rows }: { rows: ReportsData["sourceFunnel"] }) {
  const t = useTranslations();
  const locale = useLocale();
  if (!rows.length) return <p className="px-5 pb-6 text-sm text-muted">{t("reports.noData")}</p>;
  return (
    <div className="scrollbar-thin overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm [&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
        <thead className="border-y border-line bg-surface-2/60 text-xs text-muted">
          <tr>
            <th className="px-5 py-2.5 text-start font-medium">{t("common.source")}</th>
            <th className="px-3 py-2.5 text-end font-medium">{t("reports.total")}</th>
            <th className="px-3 py-2.5 text-end font-medium">{t("reports.contacted")}</th>
            <th className="px-3 py-2.5 text-end font-medium">{t("reports.qualified")}</th>
            <th className="px-3 py-2.5 text-end font-medium">{t("reports.converted")}</th>
            <th className="w-48 px-5 py-2.5 text-start font-medium">{t("reports.conversion")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r) => {
            const rate = r.total ? r.qualified / r.total : 0;
            return (
              <tr key={r.source}>
                <td className="px-5 py-3 font-medium text-ink">{t(`enums.leadSource.${r.source}`)}</td>
                <td className="tabular px-3 py-3 text-end text-ink-2">{formatNumber(r.total, locale)}</td>
                <td className="tabular px-3 py-3 text-end text-ink-2">{formatNumber(r.contacted, locale)}</td>
                <td className="tabular px-3 py-3 text-end text-ink-2">{formatNumber(r.qualified, locale)}</td>
                <td className="tabular px-3 py-3 text-end text-ink-2">{formatNumber(r.converted, locale)}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <Bar1 pct={rate * 100} color="var(--chart-2)" />
                    </div>
                    <span className="tabular w-10 text-end text-xs font-semibold text-ink">{formatPercent(rate, locale)}</span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function ForecastChart({ rows }: { rows: ReportsData["forecast"] }) {
  const t = useTranslations("reports");
  const locale = useLocale();
  const rtl = locale === "ar";
  if (!rows.length) return <p className="px-5 pb-6 text-sm text-muted">{t("noData")}</p>;
  const ordered = [...rows.filter((r) => r.month === "overdue"), ...rows.filter((r) => r.month !== "overdue")];
  const data = ordered.map((r) => {
    const label =
      r.month === "overdue"
        ? t("overdueBucket")
        : new Intl.DateTimeFormat(locale === "ar" ? "ar-EG-u-nu-latn" : "en-US", { month: "short", year: "2-digit" }).format(new Date(`${r.month}-01T00:00:00`));
    return { ...r, label };
  });
  return (
    <div className="px-3 pb-4">
      <div className="mb-2 flex items-center gap-4 px-2 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ backgroundColor: "color-mix(in oklab, var(--chart-4) 35%, var(--surface))" }} />
          {t("unweighted")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-[var(--chart-4)]" />
          {t("weighted")}
        </span>
      </div>
      <div className="h-[260px]" role="img" aria-label={t("forecastSubtitle")}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 0 }} barGap={3} barCategoryGap="28%">
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis dataKey="label" reversed={rtl} tickLine={false} axisLine={false} tick={{ fill: "var(--muted)", fontSize: 12 }} dy={6} />
            <YAxis orientation={rtl ? "right" : "left"} tickLine={false} axisLine={false} width={52} tick={{ fill: "var(--muted)", fontSize: 12 }} tickFormatter={(v: number) => formatMoney(v, locale, "USD", { compact: true })} />
            <Tooltip
              cursor={{ fill: "var(--surface-3)", radius: 8 }}
              content={({ active, payload }) => {
                const row = payload?.[0]?.payload as (typeof data)[number] | undefined;
                if (!active || !row) return null;
                return (
                  <div className="rounded-xl border border-line bg-surface px-3 py-2 text-sm shadow-pop">
                    <p className="text-xs text-muted">{row.label}</p>
                    <p className="tabular mt-0.5 text-ink">
                      {t("unweighted")}: <span className="font-semibold">{formatMoney(row.value, locale)}</span>
                    </p>
                    <p className="tabular text-ink">
                      {t("weighted")}: <span className="font-semibold">{formatMoney(row.weighted, locale)}</span>
                    </p>
                  </div>
                );
              }}
            />
            <Bar dataKey="value" fill="color-mix(in oklab, var(--chart-4) 35%, var(--surface))" radius={[5, 5, 2, 2]} maxBarSize={36} />
            <Bar dataKey="weighted" fill="var(--chart-4)" radius={[5, 5, 2, 2]} maxBarSize={36} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function StageHealth({ rows }: { rows: ReportsData["stageVelocity"] }) {
  const t = useTranslations();
  const sn = useStageName();
  const locale = useLocale();
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="flex flex-col gap-4 px-5 pb-5">
      {rows.map((r, i) => {
        const tone = toneOf(r.color);
        const stale = r.avgAge > 30;
        return (
          <li key={r.id}>
            <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
              <span className="flex items-center gap-2 font-medium text-ink">
                <span className={cn("size-2 rounded-full", TONES[tone].dot)} />
                {sn(r.name)}
              </span>
              <span className="tabular text-muted">
                <span className="font-semibold text-ink">{formatMoney(r.value, locale, "USD", { compact: true })}</span> · {t("dashboard.deals", { count: r.count })} ·{" "}
                <span className={stale ? "font-medium text-saffron" : undefined}>{t("reports.avgAge", { days: r.avgAge })}</span>
              </span>
            </div>
            <Bar1 pct={(r.value / max) * 100} color={toneVar(tone)} delay={i * 0.06} />
          </li>
        );
      })}
    </ul>
  );
}

export function ActivityMix({ rows }: { rows: ReportsData["activityMix"] }) {
  const t = useTranslations();
  const locale = useLocale();
  const order = ["call", "email", "meeting", "task"] as const;
  return (
    <ul className="grid grid-cols-2 gap-3 px-5 pb-5">
      {order.map((type) => {
        const r = rows.find((x) => x.type === type);
        const total = r?.total ?? 0;
        const rate = total ? (r!.done / total) : 0;
        const tone = ACTIVITY_TONE[type];
        return (
          <li key={type} className="rounded-xl border border-line bg-surface-2 p-3.5">
            <p className="flex items-center gap-2 text-xs font-medium text-muted">
              <span className={cn("size-2 rounded-full", TONES[tone].dot)} />
              {t(`enums.activityType.${type}`)}
            </p>
            <p className="tabular mt-1.5 text-xl font-semibold text-ink">{formatNumber(total, locale)}</p>
            <p className="mb-2 text-xs text-muted">{t("reports.completion", { rate: formatPercent(rate, locale) })}</p>
            <Bar1 pct={rate * 100} color={toneVar(tone)} />
          </li>
        );
      })}
    </ul>
  );
}
