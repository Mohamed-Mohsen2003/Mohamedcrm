"use client";

import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { Dialog as D } from "radix-ui";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "@/components/shared/theme";
import {
  Building,
  CalendarCheck,
  ChartColumnBig,
  CornerDownLeft,
  Languages,
  LayoutDashboard,
  Magnet,
  Moon,
  Plus,
  ScrollText,
  Search,
  Settings2,
  SquareKanban,
  Users,
  UsersRound,
} from "lucide-react";
import { useRouter } from "@/lib/i18n/navigation";
import { useWorkspace, type CreateKind } from "@/components/shared/workspace-context";
import { formatMoney } from "@/lib/utils/format";
import type { SearchResults } from "@/server/queries/records";
import { useLocaleSwitch } from "./topbar";
import { useStageName } from "@/hooks/use-stage-name";

const EMPTY: SearchResults = { leads: [], contacts: [], companies: [], deals: [] };

function useSearch(query: string) {
  const [results, setResults] = useState<SearchResults>(EMPTY);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        .then((r) => (r.ok ? r.json() : EMPTY))
        .then((data: SearchResults) => setResults(data))
        .catch(() => undefined)
        .finally(() => setLoading(false));
    }, 160);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);
  return { results: query.trim().length < 2 ? EMPTY : results, loading };
}

const itemClass =
  "flex cursor-pointer items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm text-ink-2 outline-none data-[selected=true]:bg-surface-3 data-[selected=true]:text-ink [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted";
const groupClass =
  "[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted";

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const { openCreate, can } = useWorkspace();
  const { setTheme, resolvedTheme } = useTheme();
  const { other, switchTo } = useLocaleSwitch();
  const sn = useStageName();
  const [query, setQuery] = useState("");
  const { results, loading } = useSearch(query);

  const go = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };
  const create = (kind: CreateKind) => {
    onOpenChange(false);
    openCreate(kind);
  };

  const pages = [
    { href: "/app", label: t("nav.dashboard"), icon: LayoutDashboard },
    { href: "/app/leads", label: t("nav.leads"), icon: Magnet },
    { href: "/app/deals", label: t("nav.deals"), icon: SquareKanban },
    { href: "/app/contacts", label: t("nav.contacts"), icon: Users },
    { href: "/app/companies", label: t("nav.companies"), icon: Building },
    { href: "/app/activities", label: t("nav.activities"), icon: CalendarCheck },
    { href: "/app/reports", label: t("nav.reports"), icon: ChartColumnBig },
    { href: "/app/team", label: t("nav.team"), icon: UsersRound },
    ...(can("audit:read") ? [{ href: "/app/audit", label: t("nav.audit"), icon: ScrollText }] : []),
    { href: "/app/settings", label: t("nav.settings"), icon: Settings2 },
  ];

  const hasResults = Object.values(results).some((r) => r.length > 0);

  return (
    <D.Root
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) setQuery("");
      }}
    >
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-[#06110f]/45 backdrop-blur-[2px] data-[state=open]:animate-[fade-in_150ms_ease-out]" />
        <D.Content className="fixed start-1/2 top-[12vh] z-50 w-[calc(100vw-2rem)] max-w-2xl -translate-x-1/2 overflow-hidden rounded-[20px] border border-line bg-surface shadow-pop rtl:translate-x-1/2 data-[state=open]:animate-[dialog-in_220ms_cubic-bezier(0.2,0.9,0.3,1.15)]">
          <D.Title className="sr-only">{t("nav.searchEverything")}</D.Title>
          <D.Description className="sr-only">{t("palette.placeholder")}</D.Description>
          <Command shouldFilter={false} loop className="flex max-h-[min(70vh,560px)] flex-col">
            <div className="flex items-center gap-3 border-b border-line px-5">
              <Search className="size-[18px] shrink-0 text-muted" />
              <Command.Input
                value={query}
                onValueChange={setQuery}
                placeholder={t("palette.placeholder")}
                className="h-14 w-full bg-transparent text-[15px] text-ink outline-none placeholder:text-muted"
              />
              {loading && <span className="size-4 shrink-0 animate-spin rounded-full border-2 border-line border-t-primary" aria-hidden />}
            </div>
            <Command.List className="scrollbar-thin overflow-y-auto p-2">
              {query.trim().length >= 2 && !hasResults && !loading && (
                <Command.Empty className="px-3 py-10 text-center text-sm text-muted">{t("palette.empty", { query: query.trim() })}</Command.Empty>
              )}

              {(
                [
                  ["deals", t("nav.deals"), SquareKanban, "/app/deals"],
                  ["leads", t("nav.leads"), Magnet, "/app/leads"],
                  ["contacts", t("nav.contacts"), Users, "/app/contacts"],
                  ["companies", t("nav.companies"), Building, "/app/companies"],
                ] as const
              ).map(([key, heading, Icon, base]) =>
                results[key].length ? (
                  <Command.Group key={key} heading={heading} className={groupClass}>
                    {results[key].map((row) => (
                      <Command.Item key={row.id} value={`${key}-${row.id}`} onSelect={() => go(`${base}/${row.id}`)} className={itemClass}>
                        <Icon />
                        <span className="min-w-0 flex-1 truncate">
                          <span className="font-medium text-ink">{row.title}</span>
                          {row.subtitle && <span className="ms-2 text-muted">{key === "deals" ? sn(row.subtitle) : row.subtitle}</span>}
                        </span>
                        {"value" in row && typeof row.value === "number" && (
                          <span className="tabular text-xs text-muted">{formatMoney(row.value, locale, "USD", { compact: true })}</span>
                        )}
                      </Command.Item>
                    ))}
                  </Command.Group>
                ) : null,
              )}

              {query.trim().length < 2 && (
                <>
                  <Command.Group heading={t("palette.create")} className={groupClass}>
                    {(
                      [
                        ["lead", t("palette.newLead")],
                        ["deal", t("palette.newDeal")],
                        ["contact", t("palette.newContact")],
                        ["company", t("palette.newCompany")],
                        ["activity", t("palette.newActivity")],
                      ] as const
                    ).map(([kind, label]) => (
                      <Command.Item key={kind} value={`create-${kind}`} onSelect={() => create(kind)} className={itemClass}>
                        <Plus />
                        {label}
                      </Command.Item>
                    ))}
                  </Command.Group>
                  <Command.Group heading={t("palette.pages")} className={groupClass}>
                    {pages.map(({ href, label, icon: Icon }) => (
                      <Command.Item key={href} value={`page-${href}`} onSelect={() => go(href)} className={itemClass}>
                        <Icon />
                        {label}
                      </Command.Item>
                    ))}
                    <Command.Item
                      value="toggle-theme"
                      onSelect={() => {
                        setTheme(resolvedTheme === "dark" ? "light" : "dark");
                        onOpenChange(false);
                      }}
                      className={itemClass}
                    >
                      <Moon />
                      {t("palette.toggleTheme")}
                    </Command.Item>
                    <Command.Item
                      value="switch-language"
                      onSelect={() => {
                        onOpenChange(false);
                        switchTo(other);
                      }}
                      className={itemClass}
                    >
                      <Languages />
                      {t("palette.switchLanguage")}
                    </Command.Item>
                  </Command.Group>
                </>
              )}
            </Command.List>
            <div className="flex items-center gap-4 border-t border-line px-5 py-2.5 text-xs text-muted">
              <span className="flex items-center gap-1.5">
                <CornerDownLeft className="size-3.5" /> {t("common.open")}
              </span>
              <span>↑ ↓</span>
              <span className="ms-auto">esc</span>
            </div>
          </Command>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
