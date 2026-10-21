"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useStageName } from "@/hooks/use-stage-name";
import { toast } from "sonner";
import { motion, useReducedMotion } from "motion/react";
import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CalendarDays, Plus, Trophy } from "lucide-react";
import { useRouter } from "@/lib/i18n/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Field, Select } from "@/components/ui/field";
import { useWorkspace } from "@/components/shared/workspace-context";
import { moveDealAction } from "@/server/actions/records";
import { formatDate, formatMoney } from "@/lib/utils/format";
import { PRIORITY_TONE, TONES, toneOf, toneVar } from "@/lib/utils/tones";
import { cn } from "@/lib/utils/cn";
import type { DealRow, getBoard } from "@/server/queries/records";
import { LOST_REASONS } from "@/lib/utils/lost-reasons";

type Column = Awaited<ReturnType<typeof getBoard>>[number];
type Columns = Record<string, DealRow[]>;

const toColumns = (cols: Column[]): Columns => Object.fromEntries(cols.map((c) => [c.id, c.deals]));

/* ------------------------------------------------------------------ */
/* Card                                                                */
/* ------------------------------------------------------------------ */

function DealCard({ deal, overlay, onOpen }: { deal: DealRow; overlay?: boolean; onOpen?: () => void }) {
  const locale = useLocale();
  const t = useTranslations();
  const overdue = deal.stageKind === "open" && deal.expectedCloseDate && new Date(deal.expectedCloseDate) < new Date(new Date().toDateString());
  const [company, product] = deal.title.includes(" — ") ? deal.title.split(" — ") : [deal.companyName ?? "", deal.title];
  return (
    <div
      className={cn(
        "group/card rounded-[14px] border border-line bg-surface p-3.5 text-start shadow-1 transition-[box-shadow,border-color]",
        !overlay && "hover:border-line-strong hover:shadow-2",
        overlay && "rotate-[2.5deg] cursor-grabbing border-primary/40 shadow-pop ring-4 ring-ring/25",
      )}
      onClick={onOpen}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="line-clamp-2 text-sm font-semibold leading-snug text-ink">{company || product}</p>
        <span className={cn("mt-1 size-2 shrink-0 rounded-full", TONES[PRIORITY_TONE[deal.priority]].dot)} title={t(`enums.priority.${deal.priority}`)} />
      </div>
      {company && <p className="mt-0.5 line-clamp-1 text-[13px] text-muted">{product}</p>}
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="tabular text-[15px] font-semibold text-ink">{formatMoney(deal.value, locale)}</span>
        {deal.ownerName && <Avatar name={deal.ownerName} hue={deal.ownerHue} size="xs" />}
      </div>
      {(deal.expectedCloseDate || deal.closedAt) && (
        <p className={cn("mt-2 flex items-center gap-1.5 text-xs", overdue ? "font-medium text-rose" : "text-muted")}>
          <CalendarDays className="size-3.5" />
          {deal.closedAt ? formatDate(deal.closedAt, locale, { day: "numeric", month: "short" }) : formatDate(deal.expectedCloseDate, locale, { day: "numeric", month: "short" })}
          {overdue && <span>· {t("deals.overdueClose")}</span>}
        </p>
      )}
    </div>
  );
}

function SortableDeal({ deal, disabled }: { deal: DealRow; disabled: boolean }) {
  const router = useRouter();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: deal.id, disabled, data: { stageId: deal.stageId } });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn("touch-manipulation outline-none", isDragging && "opacity-40", disabled ? "cursor-pointer" : "cursor-grab")}
      {...attributes}
      {...listeners}
      onKeyDown={(e) => {
        if (e.key === "Enter") router.push(`/app/deals/${deal.id}`);
        listeners?.onKeyDown?.(e);
      }}
    >
      <DealCard deal={deal} onOpen={() => router.push(`/app/deals/${deal.id}`)} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Column                                                              */
/* ------------------------------------------------------------------ */

function StageColumn({ stage, deals, canDrag }: { stage: Column; deals: DealRow[]; canDrag: (d: DealRow) => boolean }) {
  const t = useTranslations();
  const locale = useLocale();
  const { openCreate } = useWorkspace();
  const sn = useStageName();
  const { setNodeRef, isOver } = useDroppable({ id: `col:${stage.id}`, data: { stageId: stage.id } });
  const total = deals.reduce((s, d) => s + d.value, 0);
  const weighted = Math.round((total * stage.probability) / 100);
  const tone = toneOf(stage.color);
  const ids = useMemo(() => deals.map((d) => d.id), [deals]);

  return (
    <section
      aria-label={sn(stage.name)}
      className={cn(
        "flex w-[296px] shrink-0 flex-col rounded-[18px] border border-transparent bg-surface-3/60 transition-[background-color,border-color]",
        isOver && "border-primary/30 bg-primary-soft/50",
      )}
    >
      <header className="px-3.5 pb-3 pt-3.5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
            <span className={cn("size-2.5 rounded-full", TONES[tone].dot)} aria-hidden />
            {sn(stage.name)}
            <span className="tabular rounded-full bg-surface px-2 py-0.5 text-xs font-medium text-muted">{deals.length}</span>
          </h2>
          {stage.kind === "open" && (
            <button
              type="button"
              onClick={() => openCreate("deal", { stageId: stage.id })}
              className="grid size-7 place-items-center rounded-full text-muted transition hover:bg-surface hover:text-ink"
              aria-label={`${t("deals.new")} · ${sn(stage.name)}`}
            >
              <Plus className="size-4" />
            </button>
          )}
        </div>
        <div className="mt-2 flex items-baseline justify-between text-xs">
          <span className="tabular font-semibold text-ink-2">{formatMoney(total, locale, "USD", { compact: true })}</span>
          {stage.kind === "open" && (
            <span className="tabular text-muted">
              {t("deals.weighted")} {formatMoney(weighted, locale, "USD", { compact: true })} · {stage.probability}%
            </span>
          )}
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface">
          <motion.div className="h-full rounded-full" style={{ backgroundColor: toneVar(tone) }} initial={false} animate={{ width: `${stage.probability}%` }} />
        </div>
      </header>
      <div ref={setNodeRef} className="scrollbar-thin flex min-h-24 flex-1 flex-col gap-2.5 overflow-y-auto px-2.5 pb-3">
        <SortableContext id={stage.id} items={ids} strategy={verticalListSortingStrategy}>
          {deals.map((deal) => (
            <SortableDeal key={deal.id} deal={deal} disabled={!canDrag(deal)} />
          ))}
        </SortableContext>
        {deals.length === 0 && (
          <div className="grid flex-1 place-items-center rounded-[14px] border border-dashed border-line-strong px-4 py-8 text-center text-xs text-muted">{t("deals.emptyColumn")}</div>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Celebration                                                         */
/* ------------------------------------------------------------------ */

function Burst({ onDone }: { onDone: () => void }) {
  const reduce = useReducedMotion();
  useEffect(() => {
    const timer = setTimeout(onDone, 1400);
    return () => clearTimeout(timer);
  }, [onDone]);
  if (reduce) return null;
  const colors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[60] grid place-items-center">
      <motion.div initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: [0.4, 1.15, 1], opacity: [0, 1, 0] }} transition={{ duration: 1.2, times: [0, 0.3, 1] }} className="grid size-20 place-items-center rounded-full bg-primary text-primary-ink shadow-pop">
        <Trophy className="size-9" />
      </motion.div>
      {Array.from({ length: 22 }, (_, i) => {
        const angle = (i / 22) * Math.PI * 2;
        const dist = 120 + (i % 4) * 30;
        return (
          <motion.span
            key={i}
            className="absolute size-2.5 rounded-[3px]"
            style={{ backgroundColor: colors[i % colors.length] }}
            initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
            animate={{ x: Math.cos(angle) * dist, y: Math.sin(angle) * dist + 40, opacity: 0, rotate: 220 }}
            transition={{ duration: 1.1, ease: [0.2, 0.8, 0.3, 1] }}
          />
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Board                                                               */
/* ------------------------------------------------------------------ */


export function DealBoard({ initial }: { initial: Column[] }) {
  const t = useTranslations();
  const sn = useStageName();
  const { canModify } = useWorkspace();
  const p = useId();
  const stages = initial;
  const [columns, setColumns] = useState<Columns>(() => toColumns(initial));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const [pendingLost, setPendingLost] = useState<{ dealId: string; stageId: string; index: number } | null>(null);
  const snapshot = useRef<Columns | null>(null);
  const fromStage = useRef<string | null>(null);

  // Server data changed (filters, revalidation) — resync unless a drag is in flight.
  const [source, setSource] = useState(initial);
  if (source !== initial && !activeId) {
    setSource(initial);
    setColumns(toColumns(initial));
  }

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // Long-press on touch so the board can still be scrolled with a swipe.
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const findStage = (id: string) => {
    if (id.startsWith("col:")) return id.slice(4);
    return Object.keys(columns).find((key) => columns[key]!.some((d) => d.id === id));
  };
  const activeDeal = activeId ? Object.values(columns).flat().find((d) => d.id === activeId) : null;
  const stageById = (id: string) => stages.find((s) => s.id === id)!;

  const onDragStart = ({ active }: DragStartEvent) => {
    setActiveId(String(active.id));
    snapshot.current = columns;
    fromStage.current = findStage(String(active.id)) ?? null;
  };

  const onDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) return;
    const from = findStage(String(active.id));
    const to = findStage(String(over.id));
    if (!from || !to || from === to) return;
    setColumns((prev) => {
      const source = prev[from]!;
      const target = prev[to]!;
      const moving = source.find((d) => d.id === active.id);
      if (!moving) return prev;
      const overIndex = target.findIndex((d) => d.id === over.id);
      const index = overIndex >= 0 ? overIndex : target.length;
      const stage = stageById(to);
      return {
        ...prev,
        [from]: source.filter((d) => d.id !== active.id),
        [to]: [...target.slice(0, index), { ...moving, stageId: to, stageKind: stage.kind, stageName: stage.name, stageColor: stage.color }, ...target.slice(index)],
      };
    });
  };

  const revert = () => {
    if (snapshot.current) setColumns(snapshot.current);
  };

  const commit = async (dealId: string, stageId: string, index: number, lostReason?: string) => {
    const stage = stageById(stageId);
    const result = await moveDealAction({ dealId, stageId, index, lostReason });
    if (!result.ok) {
      revert();
      toast.error(t.has(`errors.${result.error}`) ? t(`errors.${result.error}`) : t("errors.server_error"));
      return;
    }
    if (fromStage.current !== stageId) {
      if (stage.kind === "won") {
        setCelebrate(true);
        toast.success(t("toasts.deal_won"));
      } else if (stage.kind === "lost") toast(t("toasts.deal_lost"));
      else toast.success(t("toasts.deal_moved", { stage: sn(stage.name) }));
    }
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    const id = String(active.id);
    setActiveId(null);
    if (!over) return revert();
    const stageId = findStage(String(over.id)) ?? findStage(id);
    if (!stageId) return revert();
    const list = columns[stageId]!;
    const oldIndex = list.findIndex((d) => d.id === id);
    const overIndex = String(over.id).startsWith("col:") ? list.length - 1 : list.findIndex((d) => d.id === over.id);
    const newIndex = overIndex < 0 ? oldIndex : overIndex;
    const reordered = oldIndex !== newIndex ? arrayMove(list, oldIndex, newIndex) : list;
    setColumns((prev) => ({ ...prev, [stageId]: reordered }));

    const unchanged = fromStage.current === stageId && oldIndex === newIndex && snapshot.current?.[stageId]?.findIndex((d) => d.id === id) === newIndex;
    if (unchanged) return;
    if (stageById(stageId).kind === "lost" && fromStage.current !== stageId) {
      setPendingLost({ dealId: id, stageId, index: newIndex });
      return;
    }
    void commit(id, stageId, newIndex);
  };

  return (
    <>
      <DndContext
        id={p}
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={() => {
          setActiveId(null);
          revert();
        }}
        accessibility={{ screenReaderInstructions: { draggable: t("deals.dragHint") } }}
      >
        <div className="scrollbar-thin -mx-4 flex gap-3 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8" style={{ height: "calc(100dvh - 15rem)", minHeight: 520 }}>
          {stages.map((stage) => (
            <StageColumn key={stage.id} stage={stage} deals={columns[stage.id] ?? []} canDrag={(d) => canModify(d.ownerId)} />
          ))}
        </div>
        <DragOverlay dropAnimation={{ duration: 220, easing: "cubic-bezier(.2,.8,.2,1)" }}>{activeDeal ? <DealCard deal={activeDeal} overlay /> : null}</DragOverlay>
      </DndContext>

      {celebrate && <Burst onDone={() => setCelebrate(false)} />}

      <Dialog
        open={Boolean(pendingLost)}
        onOpenChange={(o) => {
          if (!o) {
            setPendingLost(null);
            revert();
          }
        }}
      >
        <DialogContent title={t("deals.lostReasonTitle")} description={t("deals.lostReasonBody")} size="sm" closeLabel={t("common.close")}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const reason = String(new FormData(e.currentTarget).get("reason") ?? "");
              const job = pendingLost!;
              setPendingLost(null);
              void commit(job.dealId, job.stageId, job.index, reason);
            }}
          >
            <div className="px-6 py-5">
              <Field label={t("deals.lostReason")} htmlFor={`${p}reason`}>
                <Select id={`${p}reason`} name="reason" defaultValue={LOST_REASONS[0].value}>
                  {LOST_REASONS.map((r) => (
                    <option key={r.key} value={r.value}>
                      {t(`deals.lostReasons.${r.key}`)}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setPendingLost(null);
                  revert();
                }}
              >
                {t("common.cancel")}
              </Button>
              <Button type="submit" variant="danger">
                {t("deals.markLost")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
