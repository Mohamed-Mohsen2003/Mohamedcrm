"use client";

import { useTransition, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "@/components/shared/theme";
import {
  Building,
  CalendarCheck,
  Globe,
  Languages,
  LogOut,
  Magnet,
  Monitor,
  Moon,
  Plus,
  Search,
  Settings2,
  SquareKanban,
  Sun,
  Users,
} from "lucide-react";
import { usePathname, useRouter } from "@/lib/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/misc";
import { Avatar } from "@/components/ui/avatar";
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { useWorkspace, type CreateKind } from "@/components/shared/workspace-context";
import { logoutAction } from "@/server/actions/auth";

export function useLocaleSwitch() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();
  const switchTo = (next: "en" | "ar") => {
    // Read at click time so pages using this hook stay statically renderable.
    const qs = window.location.search.slice(1);
    start(() => router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { locale: next, scroll: false }));
  };
  return { locale, switchTo, pending, other: (locale === "ar" ? "en" : "ar") as "en" | "ar" };
}

export function Topbar({ onOpenPalette, mobileTrigger }: { onOpenPalette: () => void; mobileTrigger: ReactNode }) {
  const t = useTranslations("nav");
  const tp = useTranslations("palette");
  const tc = useTranslations("common");
  const { user, openCreate } = useWorkspace();
  const { theme, setTheme } = useTheme();
  const { other, switchTo } = useLocaleSwitch();
  const router = useRouter();

  const createItems: Array<{ kind: CreateKind; label: string; icon: typeof Magnet }> = [
    { kind: "lead", label: tp("newLead"), icon: Magnet },
    { kind: "deal", label: tp("newDeal"), icon: SquareKanban },
    { kind: "contact", label: tp("newContact"), icon: Users },
    { kind: "company", label: tp("newCompany"), icon: Building },
    { kind: "activity", label: tp("newActivity"), icon: CalendarCheck },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-line/80 bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-[1480px] items-center gap-2 px-4 sm:px-6 lg:px-8">
        {mobileTrigger}

        <button
          type="button"
          onClick={onOpenPalette}
          className="group flex h-10 min-w-0 flex-1 items-center gap-2.5 rounded-full border border-line bg-surface px-4 text-sm text-muted shadow-1 transition hover:border-line-strong sm:max-w-md"
          aria-label={t("searchEverything")}
        >
          <Search className="size-4 shrink-0" />
          <span className="truncate">{t("searchEverything")}</span>
          <span className="ms-auto hidden items-center gap-1 sm:flex" aria-hidden>
            <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
          </span>
        </button>

        <div className="ms-auto flex items-center gap-1.5">
          <span className="me-1 hidden rounded-full bg-saffron-soft px-2.5 py-1 text-xs font-medium text-saffron xl:inline">{tc("demoBadge")}</span>

          <Menu>
            <MenuTrigger asChild>
              <Button size="sm" className="h-10 rounded-full px-4">
                <Plus />
                <span className="hidden sm:inline">{t("quickAdd")}</span>
              </Button>
            </MenuTrigger>
            <MenuContent>
              {createItems.map(({ kind, label, icon: Icon }) => (
                <MenuItem key={kind} onSelect={() => openCreate(kind)}>
                  <Icon />
                  {label}
                </MenuItem>
              ))}
            </MenuContent>
          </Menu>

          <Menu>
            <MenuTrigger asChild>
              <button type="button" className="hidden size-10 place-items-center rounded-full text-ink-2 transition hover:bg-surface-3 sm:grid" aria-label={t("theme")}>
                <Sun className="size-[18px] dark:hidden" />
                <Moon className="hidden size-[18px] dark:block" />
              </button>
            </MenuTrigger>
            <MenuContent className="min-w-40">
              {(
                [
                  ["light", Sun],
                  ["dark", Moon],
                  ["system", Monitor],
                ] as const
              ).map(([value, Icon]) => (
                <MenuItem key={value} onSelect={() => setTheme(value)} className={theme === value ? "font-semibold" : undefined}>
                  <Icon />
                  {t(value)}
                </MenuItem>
              ))}
            </MenuContent>
          </Menu>

          <button
            type="button"
            onClick={() => switchTo(other)}
            className="hidden h-10 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-ink-2 transition hover:bg-surface-3 sm:flex"
            aria-label={t("language")}
          >
            <Languages className="size-[18px]" />
            <span lang={other}>{other === "ar" ? "العربية" : "English"}</span>
          </button>

          <Menu>
            <MenuTrigger asChild>
              <button type="button" className="rounded-full outline-offset-2" aria-label={t("profile")}>
                <Avatar name={user.name} hue={user.avatarHue} size="md" className="ring-0" />
              </button>
            </MenuTrigger>
            <MenuContent className="w-64">
              <MenuLabel className="text-sm text-ink">
                <span className="block font-semibold">{user.name}</span>
                <span className="block truncate text-xs font-normal text-muted">{user.email}</span>
              </MenuLabel>
              <MenuSeparator />
              <MenuItem onSelect={() => router.push("/app/settings")}>
                <Settings2 />
                {t("settings")}
              </MenuItem>
              <MenuItem onSelect={() => switchTo(other)} className="sm:hidden">
                <Languages />
                {other === "ar" ? "العربية" : "English"}
              </MenuItem>
              <MenuItem onSelect={() => setTheme(theme === "dark" ? "light" : "dark")} className="sm:hidden">
                <Moon />
                {t("theme")}
              </MenuItem>
              <MenuItem onSelect={() => router.push("/")}>
                <Globe />
                {t("home")}
              </MenuItem>
              <MenuSeparator />
              <MenuItem
                tone="danger"
                onSelect={async () => {
                  await logoutAction();
                  router.replace("/login");
                  router.refresh();
                }}
              >
                <LogOut />
                {t("signOut")}
              </MenuItem>
            </MenuContent>
          </Menu>
        </div>
      </div>
    </header>
  );
}
