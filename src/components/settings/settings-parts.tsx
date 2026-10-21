"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, Reorder, useDragControls } from "motion/react";
import { ArrowDown, ArrowUp, GripVertical, Monitor, Moon, Plus, RotateCcw, Sun, Trash } from "lucide-react";
import { useRouter } from "@/lib/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Confirm } from "@/components/shared/confirm";
import { useTheme } from "@/components/shared/theme";
import { useLocaleSwitch } from "@/components/layout/topbar";
import { useAction } from "@/hooks/use-action";
import { resetDemoAction, saveStagesAction } from "@/server/actions/workspace";
import { TONES, type Tone } from "@/lib/utils/tones";
import { cn } from "@/lib/utils/cn";
import type { Stage } from "@/lib/db/schema";

function Choice<T extends string>({ value, options, onChange, label }: { value: T; options: Array<{ value: T; label: string; icon?: typeof Sun }>; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex gap-1 rounded-full border border-line bg-surface-2 p-1">
      {options.map((o) => {
        const Icon = o.icon;
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn("flex h-8 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition", active ? "bg-surface text-ink shadow-1" : "text-muted hover:text-ink")}
          >
            {Icon && <Icon className="size-4" />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function AppearanceSettings() {
  const t = useTranslations();
  const { theme, setTheme } = useTheme();
  const { locale, switchTo } = useLocaleSwitch();
  return (
    <div className="flex flex-col gap-5 px-5 pb-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm font-medium text-ink-2">{t("settings.theme")}</span>
        <Choice
          label={t("settings.theme")}
          value={theme}
          onChange={setTheme}
          options={[
            { value: "light", label: t("nav.light"), icon: Sun },
            { value: "dark", label: t("nav.dark"), icon: Moon },
            { value: "system", label: t("nav.system"), icon: Monitor },
          ]}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm font-medium text-ink-2">{t("settings.language")}</span>
        <Choice
          label={t("settings.language")}
          value={locale as "en" | "ar"}
          onChange={(v) => switchTo(v)}
          options={[
            { value: "en", label: "English" },
            { value: "ar", label: "العربية" },
          ]}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pipeline editor                                                     */
/* ------------------------------------------------------------------ */

type Draft = { key: string; id?: string; name: string; probability: number; color: Tone };
const COLORS: Tone[] = ["sky", "iris", "saffron", "coral", "jade", "rose", "slate"];

function StageRow({ stage, index, count, onChange, onMove, onRemove, disabled }: { stage: Draft; index: number; count: number; onChange: (patch: Partial<Draft>) => void; onMove: (dir: -1 | 1) => void; onRemove: () => void; disabled: boolean }) {
  const t = useTranslations();
  const controls = useDragControls();
  return (
    <Reorder.Item value={stage} dragListener={false} dragControls={controls} className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface p-2.5 sm:flex-nowrap">
      <button type="button" onPointerDown={(e) => controls.start(e)} className="grid size-8 cursor-grab touch-none place-items-center rounded-md text-muted hover:bg-surface-3 active:cursor-grabbing" aria-hidden tabIndex={-1} disabled={disabled}>
        <GripVertical className="size-4" />
      </button>
      <Input aria-label={t("settings.stageName")} value={stage.name} onChange={(e) => onChange({ name: e.target.value })} className="h-9 min-w-40 flex-1" maxLength={40} disabled={disabled} />
      <div className="flex items-center gap-1.5">
        <Input
          aria-label={t("deals.probability")}
          type="number"
          min={0}
          max={100}
          value={stage.probability}
          onChange={(e) => onChange({ probability: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })}
          className="tabular h-9 w-20"
          disabled={disabled}
        />
        <span className="text-sm text-muted">%</span>
      </div>
      <div className="flex items-center gap-1" role="radiogroup" aria-label="Color">
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={stage.color === c}
            aria-label={t(`enums.color.${c}`)}
            onClick={() => onChange({ color: c })}
            disabled={disabled}
            className={cn("size-5 rounded-full ring-offset-2 ring-offset-surface transition", TONES[c].dot, stage.color === c && "ring-2 ring-ink")}
          />
        ))}
      </div>
      <div className="flex items-center">
        <button type="button" onClick={() => onMove(-1)} disabled={disabled || index === 0} className="grid size-8 place-items-center rounded-md text-muted hover:bg-surface-3 disabled:opacity-30" aria-label={t("settings.moveUp")}>
          <ArrowUp className="size-4" />
        </button>
        <button type="button" onClick={() => onMove(1)} disabled={disabled || index === count - 1} className="grid size-8 place-items-center rounded-md text-muted hover:bg-surface-3 disabled:opacity-30" aria-label={t("settings.moveDown")}>
          <ArrowDown className="size-4" />
        </button>
        <button type="button" onClick={onRemove} disabled={disabled || count <= 1} className="grid size-8 place-items-center rounded-md text-muted hover:bg-rose-soft hover:text-rose disabled:opacity-30" aria-label={t("settings.removeStage")}>
          <Trash className="size-4" />
        </button>
      </div>
    </Reorder.Item>
  );
}

export function PipelineEditor({ stages, editable }: { stages: Stage[]; editable: boolean }) {
  const t = useTranslations();
  const { run, pending } = useAction();
  const toDraft = (s: Stage): Draft => ({ key: s.id, id: s.id, name: s.name, probability: s.probability, color: (COLORS.includes(s.color as Tone) ? s.color : "slate") as Tone });
  const [drafts, setDrafts] = useState<Draft[]>(() => stages.filter((s) => s.kind === "open").map(toDraft));
  const closed = stages.filter((s) => s.kind !== "open");

  const patch = (key: string, p: Partial<Draft>) => setDrafts((d) => d.map((s) => (s.key === key ? { ...s, ...p } : s)));
  const move = (index: number, dir: -1 | 1) =>
    setDrafts((d) => {
      const next = [...d];
      const [item] = next.splice(index, 1);
      next.splice(index + dir, 0, item!);
      return next;
    });

  return (
    <div className="px-5 pb-5">
      <Reorder.Group axis="y" values={drafts} onReorder={setDrafts} className="flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {drafts.map((s, i) => (
            <StageRow
              key={s.key}
              stage={s}
              index={i}
              count={drafts.length}
              disabled={!editable}
              onChange={(p) => patch(s.key, p)}
              onMove={(dir) => move(i, dir)}
              onRemove={() => setDrafts((d) => d.filter((x) => x.key !== s.key))}
            />
          ))}
        </AnimatePresence>
      </Reorder.Group>
      <ul className="mt-2 flex flex-col gap-2">
        {closed.map((s) => (
          <li key={s.id} className="flex items-center gap-3 rounded-xl border border-dashed border-line px-4 py-3 text-sm text-muted">
            <span className={cn("size-2.5 rounded-full", TONES[(COLORS.includes(s.color as Tone) ? s.color : "slate") as Tone].dot)} />
            <span className="font-medium text-ink-2">{s.name}</span>
            <span className="ms-auto">{t(`enums.stageKind.${s.kind}`)}</span>
          </li>
        ))}
      </ul>
      {editable ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={drafts.length >= 8}
            onClick={() => setDrafts((d) => [...d, { key: `new-${Date.now()}`, name: "", probability: 50, color: "sky" }])}
          >
            <Plus />
            {t("settings.addStage")}
          </Button>
          <Button
            loading={pending}
            onClick={() => run(() => saveStagesAction(drafts.map(({ id, name, probability, color }) => ({ id, name, probability, color }))))}
          >
            {t("settings.savePipeline")}
          </Button>
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted">{t("settings.pipelineReadOnly")}</p>
      )}
    </div>
  );
}

export function ResetDemo() {
  const t = useTranslations("settings");
  const router = useRouter();
  const { run, pending } = useAction();
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 pb-5">
      <p className="max-w-md text-sm text-muted">{t("workspaceHint")}</p>
      <Confirm
        trigger={
          <Button variant="secondary">
            <RotateCcw />
            {t("reset")}
          </Button>
        }
        title={t("resetTitle")}
        description={t("resetBody")}
        confirmLabel={t("resetConfirm")}
        pending={pending}
        onConfirm={() =>
          run(() => resetDemoAction(), {
            onSuccess: () => {
              router.replace("/login");
              router.refresh();
            },
          })
        }
      />
    </div>
  );
}
