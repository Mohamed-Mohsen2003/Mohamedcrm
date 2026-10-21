"use client";

import type { ReactNode } from "react";
import { ThemeProvider, useTheme } from "./theme";
import { Direction } from "radix-ui";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

function ThemedToaster({ dir }: { dir: "ltr" | "rtl" }) {
  const { resolvedTheme } = useTheme();
  return (
    <Toaster
      dir={dir}
      position={dir === "rtl" ? "bottom-left" : "bottom-right"}
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      toastOptions={{
        classNames: {
          toast: "!rounded-[14px] !border-line !bg-surface !text-ink !shadow-pop !font-sans",
          description: "!text-muted",
        },
      }}
      richColors
      closeButton
    />
  );
}

export function Providers({ children, dir }: { children: ReactNode; dir: "ltr" | "rtl" }) {
  return (
    <ThemeProvider>
      <Direction.Provider dir={dir}>
        <TooltipProvider>
          {children}
          <ThemedToaster dir={dir} />
        </TooltipProvider>
      </Direction.Provider>
    </ThemeProvider>
  );
}
