import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export function PageHeader({ title, description, actions, eyebrow, className }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode; className?: string }) {
  return (
    <div className={cn("mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow && <div className="mb-2">{eyebrow}</div>}
        <h1 className="text-balance text-[26px] font-semibold leading-tight tracking-[-0.02em] text-ink sm:text-[30px]">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-pretty text-[15px] text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
