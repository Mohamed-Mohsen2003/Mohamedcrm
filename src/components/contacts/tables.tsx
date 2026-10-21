"use client";

import { useLocale, useTranslations } from "next-intl";
import { Building, Users } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { SortHeader } from "@/components/shared/list-controls";
import { useWorkspace } from "@/components/shared/workspace-context";
import { formatMoney, formatNumber, formatRelative } from "@/lib/utils/format";
import { LIFECYCLE_TONE } from "@/lib/utils/tones";
import type { listCompanies, listContacts } from "@/server/queries/records";

type ContactRow = Awaited<ReturnType<typeof listContacts>>["rows"][number];
type CompanyRow = Awaited<ReturnType<typeof listCompanies>>["rows"][number];

const tableClass = "w-full min-w-[900px] text-sm [&_td]:whitespace-nowrap [&_th]:whitespace-nowrap";
const headClass = "border-b border-line bg-surface-2/60 text-xs text-muted";

function OwnerCell({ name, hue }: { name: string | null; hue: number | null }) {
  const t = useTranslations("common");
  return name ? (
    <span className="flex items-center gap-2 text-ink-2">
      <Avatar name={name} hue={hue} size="xs" />
      {name}
    </span>
  ) : (
    <span className="text-muted">{t("unassigned")}</span>
  );
}

export function ContactsTable({ rows, filtered }: { rows: ContactRow[]; filtered: boolean }) {
  const t = useTranslations();
  const locale = useLocale();
  const { openCreate } = useWorkspace();

  if (rows.length === 0) {
    return filtered ? (
      <EmptyState icon={<Users />} title={t("common.noResults")} description={t("common.noResultsHint")} />
    ) : (
      <EmptyState icon={<Users />} title={t("contacts.empty")} description={t("contacts.emptyHint")} action={<Button onClick={() => openCreate("contact")}>{t("contacts.new")}</Button>} />
    );
  }

  return (
    <div className="scrollbar-thin overflow-x-auto">
      <table className={tableClass}>
        <thead className={headClass}>
          <tr>
            <SortHeader column="name">{t("common.name")}</SortHeader>
            <SortHeader column="company">{t("common.company")}</SortHeader>
            <th scope="col" className="px-4 py-3 text-start font-medium">{t("common.phone")}</th>
            <SortHeader column="lifecycle">{t("contacts.lifecycle")}</SortHeader>
            <th scope="col" className="px-4 py-3 text-start font-medium">{t("contacts.tags")}</th>
            <th scope="col" className="px-4 py-3 text-start font-medium">{t("common.owner")}</th>
            <SortHeader column="created">{t("common.created")}</SortHeader>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r) => (
            <tr key={r.id} className="transition-colors hover:bg-surface-2">
              <td className="px-4 py-3">
                <Link href={`/app/contacts/${r.id}`} className="group flex items-center gap-3">
                  <Avatar name={`${r.firstName} ${r.lastName}`} hue={(r.firstName.charCodeAt(0) * 37) % 360} />
                  <span className="flex min-w-0 flex-col">
                    <span className="font-medium text-ink group-hover:text-primary">
                      {r.firstName} {r.lastName}
                    </span>
                    <span className="text-xs text-muted">{r.jobTitle}</span>
                  </span>
                </Link>
              </td>
              <td className="px-4 py-3">
                {r.companyId ? (
                  <Link href={`/app/companies/${r.companyId}`} className="text-ink-2 hover:text-primary">
                    {r.companyName}
                  </Link>
                ) : (
                  <span className="text-muted">—</span>
                )}
                <span className="block text-xs text-muted" dir="ltr" style={{ textAlign: "start" }}>
                  {r.email}
                </span>
              </td>
              <td className="px-4 py-3 text-ink-2" dir="ltr" style={{ textAlign: "start" }}>
                {r.phone}
              </td>
              <td className="px-4 py-3">
                <Badge tone={LIFECYCLE_TONE[r.lifecycle]}>{t(`enums.lifecycle.${r.lifecycle}`)}</Badge>
              </td>
              <td className="px-4 py-3">
                <span className="flex gap-1">
                  {r.tags.slice(0, 2).map((tag) => (
                    <span key={tag} className="rounded-md bg-surface-3 px-1.5 py-0.5 text-xs text-ink-2">
                      #{tag}
                    </span>
                  ))}
                </span>
              </td>
              <td className="px-4 py-3">
                <OwnerCell name={r.ownerName} hue={r.ownerHue} />
              </td>
              <td className="px-4 py-3 text-muted">{formatRelative(r.createdAt, locale)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CompaniesTable({ rows, filtered }: { rows: CompanyRow[]; filtered: boolean }) {
  const t = useTranslations();
  const locale = useLocale();
  const { openCreate } = useWorkspace();

  if (rows.length === 0) {
    return filtered ? (
      <EmptyState icon={<Building />} title={t("common.noResults")} description={t("common.noResultsHint")} />
    ) : (
      <EmptyState icon={<Building />} title={t("companies.empty")} description={t("companies.emptyHint")} action={<Button onClick={() => openCreate("company")}>{t("companies.new")}</Button>} />
    );
  }

  return (
    <div className="scrollbar-thin overflow-x-auto">
      <table className={tableClass}>
        <thead className={headClass}>
          <tr>
            <SortHeader column="name">{t("common.name")}</SortHeader>
            <th scope="col" className="px-4 py-3 text-start font-medium">{t("companies.industry")}</th>
            <th scope="col" className="px-4 py-3 text-start font-medium">{t("companies.location")}</th>
            <SortHeader column="contacts" className="text-end">{t("companies.contacts")}</SortHeader>
            <SortHeader column="open" className="text-end">{t("companies.openPipeline")}</SortHeader>
            <SortHeader column="won" className="text-end">{t("companies.wonRevenue")}</SortHeader>
            <th scope="col" className="px-4 py-3 text-start font-medium">{t("common.owner")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r) => (
            <tr key={r.id} className="transition-colors hover:bg-surface-2">
              <td className="px-4 py-3">
                <Link href={`/app/companies/${r.id}`} className="group flex items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-surface-3 text-sm font-semibold text-ink-2">{r.name.slice(0, 1)}</span>
                  <span className="flex min-w-0 flex-col">
                    <span className="font-medium text-ink group-hover:text-primary">{r.name}</span>
                    <span className="text-xs text-muted" dir="ltr" style={{ textAlign: "start" }}>
                      {r.domain}
                    </span>
                  </span>
                </Link>
              </td>
              <td className="px-4 py-3 text-ink-2">
                {r.industry ?? "—"}
                {r.size && <span className="block text-xs text-muted">{r.size}</span>}
              </td>
              <td className="px-4 py-3 text-ink-2">{[r.city, r.country].filter(Boolean).join(", ") || "—"}</td>
              <td className="tabular px-4 py-3 text-end text-ink-2">{formatNumber(r.contactCount, locale)}</td>
              <td className="tabular px-4 py-3 text-end font-medium text-ink">{formatMoney(r.openValue, locale)}</td>
              <td className="tabular px-4 py-3 text-end font-medium text-primary-strong">{formatMoney(r.wonValue, locale)}</td>
              <td className="px-4 py-3">
                <OwnerCell name={r.ownerName} hue={r.ownerHue} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
