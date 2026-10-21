import { useStageName } from "@/hooks/use-stage-name";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatMoney } from "@/lib/utils/format";
import { toneOf } from "@/lib/utils/tones";
import type { DealRow } from "@/server/queries/records";

export function RelatedDeals({ deals, emptyLabel }: { deals: DealRow[]; emptyLabel: string }) {
  const t = useTranslations("deals");
  const locale = useLocale();
  const sn = useStageName();
  if (deals.length === 0) return <p className="px-5 pb-5 text-sm text-muted">{emptyLabel}</p>;
  return (
    <ul className="divide-y divide-line border-t border-line">
      {deals.map((d) => (
        <li key={d.id}>
          <Link href={`/app/deals/${d.id}`} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{d.title}</p>
              <p className="mt-0.5 text-xs text-muted">
                {d.closedAt ? t("closedOn", { date: formatDate(d.closedAt, locale) }) : d.expectedCloseDate ? t("closingIn", { date: formatDate(d.expectedCloseDate, locale) }) : "—"}
              </p>
            </div>
            <Badge tone={toneOf(d.stageColor)}>{sn(d.stageName)}</Badge>
            <span className="tabular w-24 text-end text-sm font-semibold text-ink">{formatMoney(d.value, locale)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
