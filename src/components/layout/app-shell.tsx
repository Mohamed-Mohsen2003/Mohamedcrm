"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { motion, AnimatePresence, LayoutGroup } from "motion/react";
import {
  Building,
  CalendarCheck,
  ChartColumnBig,
  ChevronsLeft,
  LayoutDashboard,
  Magnet,
  Menu as MenuIcon,
  ScrollText,
  Settings2,
  SquareKanban,
  Users,
  UsersRound,
  X,
} from "lucide-react";
import { Link, usePathname } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils/cn";
import { useWorkspace } from "@/components/shared/workspace-context";
import { Tooltip } from "@/components/ui/tooltip";
import { Avatar } from "@/components/ui/avatar";
import { Topbar } from "./topbar";
import { Logo } from "./logo";
import { CommandPalette } from "./command-palette";
import { CreateHost } from "@/components/forms/record-forms";
import { useLocalSetting } from "@/hooks/use-local-setting";

type NavItem = { href: string; key: string; icon: typeof LayoutDashboard; permission?: "audit:read" };

const SECTIONS: Array<{ key: string; items: NavItem[] }> = [
  {
    key: "sales",
    items: [
      { href: "/app", key: "dashboard", icon: LayoutDashboard },
      { href: "/app/leads", key: "leads", icon: Magnet },
      { href: "/app/deals", key: "deals", icon: SquareKanban },
      { href: "/app/contacts", key: "contacts", icon: Users },
      { href: "/app/companies", key: "companies", icon: Building },
      { href: "/app/activities", key: "activities", icon: CalendarCheck },
    ],
  },
  {
    key: "insights",
    items: [{ href: "/app/reports", key: "reports", icon: ChartColumnBig }],
  },
  {
    key: "workspace",
    items: [
      { href: "/app/team", key: "team", icon: UsersRound },
      { href: "/app/audit", key: "audit", icon: ScrollText, permission: "audit:read" },
      { href: "/app/settings", key: "settings", icon: Settings2 },
    ],
  },
];

const COLLAPSE_KEY = "nexora.sidebar.collapsed";

function isActive(pathname: string, href: string) {
  return href === "/app" ? pathname === "/app" : pathname === href || pathname.startsWith(`${href}/`);
}

function Brand({ collapsed }: { collapsed?: boolean }) {
  return (
    <Link href="/app" className="flex items-center gap-2.5 rounded-xl px-1 py-1 text-white outline-offset-4">
      <Logo />
      {!collapsed && <span className="text-[17px] font-semibold tracking-tight">Nexora</span>}
    </Link>
  );
}

function NavList({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const { can } = useWorkspace();
  return (
    <LayoutGroup id="sidebar">
      <nav className="flex flex-col gap-6" aria-label="Main">
        {SECTIONS.map((section) => (
          <div key={section.key}>
            {!collapsed && <p className="mb-1.5 px-3 text-xs font-medium text-sidebar-muted">{t(section.key)}</p>}
            <ul className="flex flex-col gap-0.5">
              {section.items
                .filter((item) => !item.permission || can(item.permission))
                .map((item) => {
                  const active = isActive(pathname, item.href);
                  const Icon = item.icon;
                  const link = (
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "relative flex h-10 items-center gap-3 rounded-[11px] px-3 text-sm font-medium text-sidebar-ink/80 transition-colors hover:bg-sidebar-2 hover:text-white",
                        active && "text-white",
                        collapsed && "justify-center px-0",
                      )}
                    >
                      {active && (
                        <motion.span
                          layoutId="nav-active"
                          className="absolute inset-0 rounded-[11px] bg-sidebar-active"
                          transition={{ type: "spring", stiffness: 420, damping: 34 }}
                        >
                          <span className="absolute inset-y-2 start-0 w-[3px] rounded-full bg-primary" />
                        </motion.span>
                      )}
                      <Icon className="relative size-[18px] shrink-0" aria-hidden />
                      {!collapsed && <span className="relative truncate">{t(item.key)}</span>}
                    </Link>
                  );
                  return (
                    <li key={item.href}>
                      {collapsed ? (
                        <Tooltip label={t(item.key)} side="right">
                          {link}
                        </Tooltip>
                      ) : (
                        link
                      )}
                    </li>
                  );
                })}
            </ul>
          </div>
        ))}
      </nav>
    </LayoutGroup>
  );
}

function SidebarUser({ collapsed }: { collapsed: boolean }) {
  const { user } = useWorkspace();
  const t = useTranslations("enums.role");
  return (
    <div className={cn("flex items-center gap-3 rounded-[14px] bg-sidebar-2 p-2.5", collapsed && "justify-center p-1.5")}>
      <Avatar name={user.name} hue={user.avatarHue} className="ring-sidebar-2" />
      {!collapsed && (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white">{user.name}</p>
          <p className="truncate text-xs text-sidebar-muted">{t(user.role)}</p>
        </div>
      )}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const t = useTranslations("nav");
  const tc = useTranslations("common");
  const locale = useLocale();
  const pathname = usePathname();
  const [collapsedSetting, setCollapsedSetting] = useLocalSetting(COLLAPSE_KEY, "0");
  const collapsed = collapsedSetting === "1";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Close the mobile drawer on navigation.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setMobileOpen(false);
  }

  const toggleCollapsed = () => setCollapsedSetting(collapsed ? "0" : "1");

  return (
    <div className="flex min-h-dvh">
      <a href="#main" className="sr-only z-[70] rounded-lg bg-primary px-4 py-2 text-primary-ink focus:not-sr-only focus:fixed focus:start-4 focus:top-4">
        {tc("skipToContent")}
      </a>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 flex-col bg-sidebar px-3 pb-3 pt-4 transition-[width] duration-300 ease-[cubic-bezier(.2,.8,.2,1)] lg:flex",
          collapsed ? "w-[76px]" : "w-[248px]",
        )}
      >
        <div className={cn("mb-7 flex items-center justify-between", collapsed && "justify-center")}>
          <Brand collapsed={collapsed} />
        </div>
        <div className="scrollbar-thin -mx-1 flex-1 overflow-y-auto px-1">
          <NavList collapsed={collapsed} />
        </div>
        <div className="mt-3 flex flex-col gap-2">
          <button
            type="button"
            onClick={toggleCollapsed}
            className={cn(
              "flex h-9 items-center gap-3 rounded-[11px] px-3 text-sm text-sidebar-muted transition hover:bg-sidebar-2 hover:text-white",
              collapsed && "justify-center px-0",
            )}
            aria-label={collapsed ? t("expand") : t("collapse")}
          >
            <ChevronsLeft className={cn("size-4 transition-transform rtl:rotate-180", collapsed && "rotate-180 rtl:rotate-0")} />
            {!collapsed && <span>{t("collapse")}</span>}
          </button>
          <SidebarUser collapsed={collapsed} />
        </div>
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-[#06110f]/50 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              className="fixed inset-y-0 start-0 z-50 flex w-[280px] flex-col bg-sidebar px-3 pb-3 pt-4 lg:hidden"
              initial={{ x: locale === "ar" ? 300 : -300 }}
              animate={{ x: 0 }}
              exit={{ x: locale === "ar" ? 300 : -300 }}
              transition={{ type: "spring", stiffness: 380, damping: 38 }}
              aria-label={t("openMenu")}
            >
              <div className="mb-7 flex items-center justify-between">
                <Brand />
                <button type="button" onClick={() => setMobileOpen(false)} className="grid size-9 place-items-center rounded-full text-sidebar-ink hover:bg-sidebar-2" aria-label={tc("close")}>
                  <X className="size-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <NavList collapsed={false} onNavigate={() => setMobileOpen(false)} />
              </div>
              <SidebarUser collapsed={false} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          onOpenPalette={() => setPaletteOpen(true)}
          mobileTrigger={
            <button type="button" onClick={() => setMobileOpen(true)} className="grid size-10 place-items-center rounded-full text-ink-2 hover:bg-surface-3 lg:hidden" aria-label={t("openMenu")}>
              <MenuIcon className="size-5" />
            </button>
          }
        />
        <main id="main" className="mx-auto w-full max-w-[1480px] flex-1 px-4 pb-16 pt-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <CreateHost />
    </div>
  );
}
