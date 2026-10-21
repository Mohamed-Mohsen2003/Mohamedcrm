import * as React from "react";
import { cn } from "@/lib/utils/cn";

export function Panel({ className, ...props }: React.ComponentProps<"section">) {
  return <section className={cn("rounded-[var(--radius-panel)] border border-line bg-surface shadow-1", className)} {...props} />;
}

export function PanelHeader({ title, description, action, className }: { title: React.ReactNode; description?: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <header className={cn("flex items-start justify-between gap-3 px-5 pb-3 pt-5", className)}>
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold tracking-tight text-ink">{title}</h2>
        {description && <p className="mt-0.5 text-[13px] text-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
