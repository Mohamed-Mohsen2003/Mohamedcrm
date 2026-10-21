"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Download, Search, X } from "lucide-react";
import { usePathname, useRouter } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils/cn";
import { formatNumber } from "@/lib/utils/format";
import { useWorkspace } from "./workspace-context";

/** Updates URL search params (resetting pagination) inside a transition. */
export function useQueryState() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const set = (patch: Record<string, string | null | undefined>, opts: { keepPage?: boolean } = {}) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === undefined || v === "") next.delete(k);
      else next.set(k, v);
    }
    if (!opts.keepPage && !("page" in patch)) next.delete("page");
    const qs = next.toString();
    start(() => router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false }));
  };
  return { params, set, pending };
}

export function SearchBox({ placeholder }: { placeholder: string }) {
  const { params, set, pending } = useQueryState();
  const t = useTranslations("common");
  const [value, setValue] = useState(params.get("q") ?? "");
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const timer = setTimeout(() => set({ q: value.trim() || null }), 280);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="relative w-full sm:w-72">
      <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        aria-label={t("search")}
        className="h-10 w-full rounded-full border border-line bg-surface ps-9 pe-9 text-sm shadow-1 outline-none transition placeholder:text-muted/80 hover:border-line-strong focus:border-primary focus:ring-4 focus:ring-ring/40 [&::-webkit-search-cancel-button]:hidden"
      />
      {pending ? (
        <span className="absolute end-3 top-1/2 size-4 -translate-y-1/2 animate-spin rounded-full border-2 border-line border-t-primary" aria-hidden />
      ) : value ? (
        <button type="button" onClick={() => setValue("")} className="absolute end-2.5 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-surface-3" aria-label={t("clear")}>
          <X className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}

export function FilterSelect({ param, label, options }: { param: string; label: string; options: Array<{ value: string; label: string }> }) {
  const { params, set } = useQueryState();
  const value = params.get(param) ?? "";
  return (
    <div className="relative">
      <select
        aria-label={label}
        value={value}
        onChange={(e) => set({ [param]: e.target.value || null })}
        className={cn(
          "h-10 cursor-pointer appearance-none rounded-full border border-line bg-surface ps-4 pe-9 text-sm shadow-1 outline-none transition hover:border-line-strong focus:border-primary focus:ring-4 focus:ring-ring/40",
          value && "border-primary/50 bg-primary-soft text-primary-strong",
        )}
      >
        <option value="">{label}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <svg aria-hidden viewBox="0 0 16 16" className="pointer-events-none absolute end-3.5 top-1/2 size-3.5 -translate-y-1/2 text-muted" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="m4 6 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export function OwnerFilter() {
  const t = useTranslations("common");
  const { lookups } = useWorkspace();
  return (
    <FilterSelect
      param="owner"
      label={t("anyOwner")}
      options={[{ value: "me", label: t("mine") }, ...lookups.team.map((m) => ({ value: m.id, label: m.name })), { value: "none", label: t("unassigned") }]}
    />
  );
}

export function ExportButton({ entity }: { entity: "leads" | "contacts" | "companies" | "deals" }) {
  const t = useTranslations("common");
  const params = useSearchParams();
  const { can } = useWorkspace();
  if (!can("records:export")) return null;
  const qs = new URLSearchParams(params.toString());
  qs.delete("page");
  return (
    <a
      href={`/api/export/${entity}?${qs.toString()}`}
      className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm font-medium text-ink shadow-1 transition hover:border-line-strong hover:bg-surface-2"
      download
    >
      <Download className="size-4" />
      <span className="hidden sm:inline">{t("export")}</span>
    </a>
  );
}

export function ClearFilters({ keys }: { keys: string[] }) {
  const { params, set } = useQueryState();
  const t = useTranslations("common");
  const active = keys.some((k) => params.get(k));
  if (!active) return null;
  return (
    <button type="button" onClick={() => set(Object.fromEntries(keys.map((k) => [k, null])))} className="h-10 rounded-full px-3 text-sm font-medium text-muted hover:text-ink">
      {t("clearFilters")}
    </button>
  );
}

export function SortHeader({ column, children, className }: { column: string; children: ReactNode; className?: string }) {
  const { params, set } = useQueryState();
  const active = params.get("sort") === column;
  const dir = active ? (params.get("dir") === "asc" ? "asc" : "desc") : null;
  const Icon = dir === "asc" ? ArrowUp : dir === "desc" ? ArrowDown : ArrowUpDown;
  return (
    <th scope="col" aria-sort={dir === "asc" ? "ascending" : dir === "desc" ? "descending" : "none"} className={cn("px-4 py-3 text-start font-medium", className)}>
      <button
        type="button"
        onClick={() => set({ sort: column, dir: dir === "desc" ? "asc" : "desc" })}
        className={cn("-mx-1 inline-flex items-center gap-1 rounded-md px-1 transition hover:text-ink", active && "text-ink")}
      >
        {children}
        <Icon className={cn("size-3.5", !active && "opacity-40")} />
      </button>
    </th>
  );
}

export function Pagination({ page, pageCount, total, perPage }: { page: number; pageCount: number; total: number; perPage: number }) {
  const t = useTranslations("common");
  const locale = useLocale();
  const { set, pending } = useQueryState();
  if (total === 0) return null;
  const from = (page - 1) * perPage + 1;
  const to = Math.min(total, page * perPage);
  const btn = "grid size-9 place-items-center rounded-full border border-line bg-surface text-ink-2 shadow-1 transition hover:border-line-strong disabled:pointer-events-none disabled:opacity-40";
  return (
    <div className={cn("flex items-center justify-between gap-4 border-t border-line px-4 py-3 text-sm text-muted transition-opacity", pending && "opacity-60")}>
      <p className="tabular">{t("showing", { from: formatNumber(from, locale), to: formatNumber(to, locale), total: formatNumber(total, locale) })}</p>
      <div className="flex items-center gap-2">
        <span className="tabular hidden sm:inline">{t("page", { page: formatNumber(page, locale), count: formatNumber(pageCount, locale) })}</span>
        <button type="button" className={btn} disabled={page <= 1} onClick={() => set({ page: String(page - 1) })} aria-label={t("previous")}>
          <ChevronLeft className="size-4 rtl:rotate-180" />
        </button>
        <button type="button" className={btn} disabled={page >= pageCount} onClick={() => set({ page: String(page + 1) })} aria-label={t("next")}>
          <ChevronRight className="size-4 rtl:rotate-180" />
        </button>
      </div>
    </div>
  );
}

/** Segmented control backed by a URL param. */
export function Segmented({ param, options, fallback }: { param: string; options: Array<{ value: string; label: ReactNode; count?: number }>; fallback: string }) {
  const { params, set } = useQueryState();
  const current = params.get(param) ?? fallback;
  return (
    <div role="tablist" className="scrollbar-thin flex w-fit max-w-full gap-1 overflow-x-auto rounded-full border border-line bg-surface p-1 shadow-1">
      {options.map((o) => {
        const active = o.value === current;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => set({ [param]: o.value === fallback ? null : o.value })}
            className={cn(
              "flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium text-muted transition",
              active ? "bg-ink text-bg" : "hover:bg-surface-3 hover:text-ink",
            )}
          >
            {o.label}
            {o.count !== undefined && (
              <span className={cn("tabular rounded-full px-1.5 text-xs", active ? "bg-bg/20 text-bg" : "bg-surface-3 text-muted")}>{o.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
