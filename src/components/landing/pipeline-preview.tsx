"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { LayoutGroup, motion, useReducedMotion } from "motion/react";
import { formatMoney } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

type Card = { id: string; title: string; company: string; value: number; hue: number };

const COLUMNS = [
  { key: "qualification", tone: "var(--iris)" },
  { key: "proposal", tone: "var(--saffron)" },
  { key: "negotiation", tone: "var(--coral)" },
  { key: "won", tone: "var(--primary)" },
] as const;

const STATIC: Card[][] = [
  [
    { id: "a", title: "Pilot program", company: "Cedar Health", value: 18000, hue: 200 },
    { id: "b", title: "Annual license", company: "Orbit Retail", value: 24500, hue: 30 },
  ],
  [{ id: "c", title: "Fleet subscription", company: "Nile Motors", value: 31000, hue: 95 }],
  [{ id: "d", title: "Support renewal", company: "Lumen Labs", value: 12500, hue: 330 }],
  [{ id: "e", title: "Onboarding package", company: "Delta Foods", value: 9000, hue: 260 }],
];

const HERO: Card = { id: "hero", title: "Enterprise rollout", company: "Atlas Logistics", value: 48000, hue: 165 };

/**
 * A self-running miniature of the deal board: one deal travels across stages
 * and lands in "won", nudging the total. Purely decorative (aria-hidden).
 */
export function PipelinePreview({ labels, className }: { labels: { stages: [string, string, string, string]; won: string; thisMonth: string }; className?: string }) {
  const locale = useLocale();
  const reduce = useReducedMotion();
  const [step, setStep] = useState(reduce ? 3 : 0);

  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => setStep((s) => s + 1), 1900);
    return () => clearInterval(id);
  }, [reduce]);

  const heroColumn = Math.min(step % 5, 3);
  const cycle = Math.floor(step / 5);
  const wonTotal = 186_500 + (heroColumn === 3 ? HERO.value : 0);

  return (
    <div aria-hidden className={cn("pointer-events-none select-none", className)}>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs text-sidebar-muted">{labels.won} · {labels.thisMonth}</p>
          <motion.p key={wonTotal} initial={reduce ? false : { y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="tabular mt-1 text-2xl font-semibold text-white">
            {formatMoney(wonTotal, locale)}
          </motion.p>
        </div>
        <div className="flex h-10 items-end gap-1">
          {[34, 46, 40, 58, 52, 70, heroColumn === 3 ? 92 : 64].map((h, i) => (
            <motion.span key={i} className="w-2.5 rounded-t-[3px] bg-primary/70 last:bg-primary" animate={{ height: `${h}%` }} transition={{ type: "spring", stiffness: 200, damping: 20 }} />
          ))}
        </div>
      </div>
      <LayoutGroup>
        <div className="grid grid-cols-4 gap-2.5">
          {COLUMNS.map((col, ci) => {
            const cards = [...STATIC[ci]!, ...(heroColumn === ci ? [{ ...HERO, id: `hero-${cycle}` }] : [])];
            return (
              <div key={col.key} className="flex min-h-[220px] flex-col gap-2 rounded-[14px] bg-white/[0.04] p-2">
                <div className="flex items-center gap-1.5 px-1 pb-1 pt-0.5">
                  <span className="size-1.5 rounded-full" style={{ backgroundColor: col.tone }} />
                  <span className="truncate text-[11px] font-medium text-sidebar-ink">{labels.stages[ci]}</span>
                </div>
                {cards.map((card) => {
                  const isHero = card.id.startsWith("hero");
                  return (
                    <motion.div
                      key={card.id}
                      layoutId={card.id}
                      initial={isHero ? { opacity: 0, scale: 0.9 } : false}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: "spring", stiffness: 260, damping: 28 }}
                      className={cn(
                        "rounded-[10px] border border-white/[0.06] bg-sidebar-2 p-2.5",
                        isHero && "border-primary/40 bg-[color-mix(in_oklab,var(--primary)_18%,var(--sidebar-2))] shadow-[0_12px_30px_-12px_rgba(0,0,0,.6)]",
                      )}
                    >
                      <p className="truncate text-[11px] font-medium text-white">{card.company}</p>
                      <p className="truncate text-[10px] text-sidebar-muted">{card.title}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="tabular text-[11px] font-semibold text-sidebar-ink">{formatMoney(card.value, locale, "USD", { compact: true })}</span>
                        <span className="size-4 rounded-full" style={{ backgroundColor: `oklch(0.82 0.08 ${card.hue})` }} />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </LayoutGroup>
    </div>
  );
}
