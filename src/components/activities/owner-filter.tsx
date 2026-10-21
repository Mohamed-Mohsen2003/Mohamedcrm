"use client";

import { useTranslations } from "next-intl";
import { useWorkspace } from "@/components/shared/workspace-context";
import { useQueryState } from "@/components/shared/list-controls";

/** Activities default to "mine"; this filter can widen to the whole team. */
export function ActivityOwnerFilter() {
  const t = useTranslations();
  const { lookups } = useWorkspace();
  const { params, set } = useQueryState();
  const value = params.get("owner") ?? "me";
  return (
    <div className="relative">
    <select
      aria-label={t("common.owner")}
      value={value}
      onChange={(e) => set({ owner: e.target.value === "me" ? null : e.target.value })}
      className="h-10 cursor-pointer appearance-none rounded-full border border-line bg-surface ps-4 pe-9 text-sm shadow-1 outline-none transition hover:border-line-strong focus:border-primary focus:ring-4 focus:ring-ring/40"
    >
      <option value="me">{t("common.mine")}</option>
      <option value="all">{t("activities.everyone")}</option>
      {lookups.team.map((m) => (
        <option key={m.id} value={m.id}>
          {m.name}
        </option>
      ))}
    </select>
      <svg aria-hidden viewBox="0 0 16 16" className="pointer-events-none absolute end-3.5 top-1/2 size-3.5 -translate-y-1/2 text-muted" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="m4 6 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
