"use client";

import * as React from "react";
import { Dialog as D } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

type ContentProps = React.ComponentProps<typeof D.Content> & {
  title: string;
  description?: string;
  side?: "center" | "end";
  size?: "sm" | "md" | "lg";
  closeLabel?: string;
};

export function DialogContent({ title, description, side = "center", size = "md", closeLabel = "Close", className, children, ...props }: ContentProps) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-[#06110f]/45 backdrop-blur-[2px] data-[state=closed]:animate-[fade-out_150ms_ease-in] data-[state=open]:animate-[fade-in_180ms_ease-out]" />
      <D.Content
        className={cn(
          "fixed z-50 flex flex-col bg-surface text-ink shadow-pop outline-none",
          side === "center" &&
            "start-1/2 top-[8vh] max-h-[84vh] w-[calc(100vw-2rem)] -translate-x-1/2 rounded-[var(--radius-panel)] border border-line rtl:translate-x-1/2 data-[state=closed]:animate-[dialog-out_140ms_ease-in] data-[state=open]:animate-[dialog-in_260ms_cubic-bezier(0.2,0.9,0.3,1.15)]",
          side === "center" && { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl" }[size],
          side === "end" &&
            "inset-y-0 end-0 h-full w-full max-w-xl border-s border-line data-[state=closed]:animate-[sheet-out_180ms_ease-in] data-[state=open]:animate-[sheet-in_320ms_cubic-bezier(0.2,0.9,0.25,1)]",
          className,
        )}
        {...props}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
          <div className="min-w-0">
            <D.Title className="text-lg font-semibold tracking-tight">{title}</D.Title>
            {description ? (
              <D.Description className="mt-1 text-sm text-muted">{description}</D.Description>
            ) : (
              <D.Description className="sr-only">{title}</D.Description>
            )}
          </div>
          <D.Close className="-me-2 -mt-1 grid size-9 shrink-0 place-items-center rounded-full text-muted transition hover:bg-surface-3 hover:text-ink" aria-label={closeLabel}>
            <X className="size-4" />
          </D.Close>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">{children}</div>
      </D.Content>
    </D.Portal>
  );
}

export function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("sticky bottom-0 flex items-center justify-end gap-2 border-t border-line bg-surface/95 px-6 py-4 backdrop-blur", className)} {...props} />;
}
