"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "motion/react";
import { Languages, Menu, X } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { Logo } from "@/components/layout/logo";
import { useLocaleSwitch } from "@/components/layout/topbar";
import { cn } from "@/lib/utils/cn";

const LINKS = ["features", "workflow", "pricing", "faq"] as const;

export function LandingNav() {
  const t = useTranslations("landing.nav");
  const tc = useTranslations("common");
  const { other, switchTo } = useLocaleSwitch();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={cn("sticky top-0 z-40 transition-[background-color,box-shadow,border-color] duration-300", scrolled ? "border-b border-line bg-bg/85 backdrop-blur-xl" : "border-b border-transparent")}>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-ink">
        {tc("skipToContent")}
      </a>
      <div className="mx-auto flex h-16 max-w-[1240px] items-center gap-6 px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Nexora CRM">
          <Logo />
          <span className="text-[17px] font-semibold tracking-tight">Nexora</span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {LINKS.map((l) => (
            <a key={l} href={`#${l}`} className="rounded-full px-3.5 py-2 text-sm font-medium text-ink-2 transition hover:bg-surface hover:text-ink">
              {t(l)}
            </a>
          ))}
        </nav>
        <div className="ms-auto flex items-center gap-2">
          <button type="button" onClick={() => switchTo(other)} className="hidden h-10 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-ink-2 hover:bg-surface sm:flex" lang={other}>
            <Languages className="size-4" />
            {other === "ar" ? "العربية" : "English"}
          </button>
          <Link href="/login" className="hidden h-10 items-center rounded-full px-4 text-sm font-medium text-ink hover:bg-surface sm:flex">
            {t("signIn")}
          </Link>
          <Link href="/login" className="inline-flex h-10 items-center rounded-full bg-ink px-5 text-sm font-semibold text-bg transition hover:opacity-90">
            {t("tryDemo")}
          </Link>
          <button type="button" onClick={() => setOpen((o) => !o)} className="grid size-10 place-items-center rounded-full text-ink md:hidden" aria-expanded={open} aria-label={open ? tc("close") : "Menu"}>
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-line bg-bg md:hidden"
            aria-label="Mobile"
          >
            <div className="flex flex-col gap-1 px-5 py-4">
              {LINKS.map((l) => (
                <a key={l} href={`#${l}`} onClick={() => setOpen(false)} className="rounded-xl px-3 py-3 text-base font-medium text-ink-2 hover:bg-surface">
                  {t(l)}
                </a>
              ))}
              <button type="button" onClick={() => switchTo(other)} className="flex items-center gap-2 rounded-xl px-3 py-3 text-start text-base font-medium text-ink-2 hover:bg-surface" lang={other}>
                <Languages className="size-4" />
                {other === "ar" ? "العربية" : "English"}
              </button>
              <Link href="/login" className="rounded-xl px-3 py-3 text-base font-medium text-ink-2 hover:bg-surface">
                {t("signIn")}
              </Link>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
