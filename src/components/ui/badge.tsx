import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { TONES, type Tone } from "@/lib/utils/tones";

export function Badge({ tone = "slate", dot = true, className, children, ...props }: React.ComponentProps<"span"> & { tone?: Tone; dot?: boolean }) {
  return (
    <span
      className={cn("inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-xs font-medium", TONES[tone].soft, className)}
      {...props}
    >
      {dot && <span aria-hidden className={cn("size-1.5 rounded-full", TONES[tone].dot)} />}
      {children}
    </span>
  );
}
