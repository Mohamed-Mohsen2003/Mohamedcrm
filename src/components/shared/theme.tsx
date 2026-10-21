"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from "react";
import { useLocalSetting, useMediaQuery } from "@/hooks/use-local-setting";

export type Theme = "light" | "dark" | "system";
const STORAGE_KEY = "nexora.theme";

/** Runs before paint (inlined in <head>) so the first frame already has the right theme. */
export const themeScript = `(function(){try{var t=localStorage.getItem('${STORAGE_KEY}')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var r=document.documentElement;r.classList.toggle('dark',d);r.style.colorScheme=d?'dark':'light'}catch(e){}})()`;

type ThemeCtx = { theme: Theme; resolvedTheme: "light" | "dark"; setTheme: (t: Theme) => void };
const Ctx = createContext<ThemeCtx>({ theme: "system", resolvedTheme: "light", setTheme: () => undefined });

function apply(resolved: "light" | "dark") {
  const root = document.documentElement;
  // Suppress transitions while swapping palettes so the whole UI changes in one frame.
  const style = document.createElement("style");
  style.textContent = "*,*::before,*::after{transition:none!important}";
  document.head.appendChild(style);
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
  void window.getComputedStyle(document.body).opacity;
  requestAnimationFrame(() => style.remove());
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useLocalSetting(STORAGE_KEY, "system");
  const systemDark = useMediaQuery("(prefers-color-scheme: dark)");
  const theme: Theme = stored === "light" || stored === "dark" ? stored : "system";
  const resolvedTheme: "light" | "dark" = theme === "system" ? (systemDark ? "dark" : "light") : theme;

  useEffect(() => {
    if (document.documentElement.classList.contains("dark") !== (resolvedTheme === "dark")) apply(resolvedTheme);
  }, [resolvedTheme]);

  const setTheme = useCallback((next: Theme) => setStored(next), [setStored]);
  const value = useMemo(() => ({ theme, resolvedTheme, setTheme }), [theme, resolvedTheme, setTheme]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);
