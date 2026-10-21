import * as React from "react";
import { cn } from "@/lib/utils/cn";

export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div aria-hidden className={cn("skeleton rounded-lg", className)} {...props} />;
}

export function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      className={cn("inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-line bg-surface-2 px-1 font-sans text-[11px] font-medium text-muted", className)}
      {...props}
    />
  );
}

export function EmptyState({ icon, title, description, action, className }: { icon?: React.ReactNode; title: string; description?: string; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-14 text-center", className)}>
      {icon && <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary [&_svg]:size-6">{icon}</div>}
      <p className="text-[15px] font-semibold text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** Circular 0–100 score indicator used for lead scoring. */
export function ScoreRing({ value, size = 34, label }: { value: number; size?: number; label?: string }) {
  const r = (size - 5) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  const tone = v >= 70 ? "var(--primary)" : v >= 40 ? "var(--saffron)" : "var(--slate)";
  return (
    <span className="relative inline-grid shrink-0 place-items-center" style={{ width: size, height: size }} role="img" aria-label={label ?? `${v}/100`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth="3.5" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={tone}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (v / 100) * c}
          style={{ transition: "stroke-dashoffset 700ms cubic-bezier(.2,.8,.2,1)" }}
        />
      </svg>
      <span className="tabular absolute text-[11px] font-semibold text-ink">{v}</span>
    </span>
  );
}
