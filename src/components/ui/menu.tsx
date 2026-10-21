"use client";

import * as React from "react";
import { DropdownMenu as M } from "radix-ui";
import { cn } from "@/lib/utils/cn";

export const Menu = M.Root;
export const MenuTrigger = M.Trigger;
export const MenuGroup = M.Group;

export function MenuContent({ className, align = "end", sideOffset = 6, ...props }: React.ComponentProps<typeof M.Content>) {
  return (
    <M.Portal>
      <M.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-50 min-w-48 overflow-hidden rounded-[14px] border border-line bg-surface p-1.5 text-sm text-ink shadow-pop data-[state=open]:animate-[menu-in_160ms_ease-out]",
          className,
        )}
        {...props}
      />
    </M.Portal>
  );
}

export function MenuItem({ className, tone, ...props }: React.ComponentProps<typeof M.Item> & { tone?: "danger" }) {
  return (
    <M.Item
      className={cn(
        "flex cursor-pointer select-none items-center gap-2.5 rounded-[9px] px-2.5 py-2 outline-none transition-colors data-[disabled]:pointer-events-none data-[highlighted]:bg-surface-3 data-[disabled]:opacity-50 [&_svg]:size-4 [&_svg]:text-muted",
        tone === "danger" && "text-rose data-[highlighted]:bg-rose-soft [&_svg]:text-rose",
        className,
      )}
      {...props}
    />
  );
}

export function MenuLabel({ className, ...props }: React.ComponentProps<typeof M.Label>) {
  return <M.Label className={cn("px-2.5 pb-1 pt-2 text-xs text-muted", className)} {...props} />;
}

export function MenuSeparator({ className, ...props }: React.ComponentProps<typeof M.Separator>) {
  return <M.Separator className={cn("my-1.5 h-px bg-line", className)} {...props} />;
}

export const MenuSub = M.Sub;
export function MenuSubTrigger({ className, ...props }: React.ComponentProps<typeof M.SubTrigger>) {
  return (
    <M.SubTrigger
      className={cn(
        "flex cursor-pointer select-none items-center gap-2.5 rounded-[9px] px-2.5 py-2 outline-none data-[highlighted]:bg-surface-3 data-[state=open]:bg-surface-3 [&_svg]:size-4 [&_svg]:text-muted",
        className,
      )}
      {...props}
    />
  );
}
export function MenuSubContent({ className, ...props }: React.ComponentProps<typeof M.SubContent>) {
  return (
    <M.Portal>
      <M.SubContent
        sideOffset={6}
        className={cn("z-50 min-w-44 rounded-[14px] border border-line bg-surface p-1.5 text-sm shadow-pop data-[state=open]:animate-[menu-in_140ms_ease-out]", className)}
        {...props}
      />
    </M.Portal>
  );
}
