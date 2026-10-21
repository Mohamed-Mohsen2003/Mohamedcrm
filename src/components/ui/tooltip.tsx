"use client";

import * as React from "react";
import { Tooltip as T } from "radix-ui";

export const TooltipProvider = T.Provider;

export function Tooltip({ label, children, side = "top" }: { label: React.ReactNode; children: React.ReactNode; side?: "top" | "bottom" | "left" | "right" }) {
  return (
    <T.Root delayDuration={250}>
      <T.Trigger asChild>{children}</T.Trigger>
      <T.Portal>
        <T.Content
          side={side}
          sideOffset={6}
          className="z-[60] max-w-64 rounded-lg bg-ink px-2.5 py-1.5 text-xs font-medium text-bg shadow-2 data-[state=delayed-open]:animate-[menu-in_120ms_ease-out]"
        >
          {label}
        </T.Content>
      </T.Portal>
    </T.Root>
  );
}
