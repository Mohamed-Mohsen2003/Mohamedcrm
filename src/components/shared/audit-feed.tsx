import { useStageName } from "@/hooks/use-stage-name";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { Avatar } from "@/components/ui/avatar";
import { formatMoney, formatRelative } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

type FeedRow = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  entityLabel: string | null;
  meta: Record<string, unknown> | null;
  createdAt: Date;
  actorName: string | null;
  actorHue: number | null;
};

const HREF: Record<string, string> = { lead: "/app/leads", contact: "/app/contacts", company: "/app/companies", deal: "/app/deals" };

export function AuditFeed({ rows, compact }: { rows: FeedRow[]; compact?: boolean }) {
  const t = useTranslations("audit");
  const locale = useLocale();
  const sn = useStageName();
  return (
    <ol className={cn("relative flex flex-col", compact ? "px-5 pb-5" : "")}>
      {rows.map((row, i) => {
        const key = row.action.replace(".", "__");
        const actionKey = t.has(`actions.${key}`) ? `actions.${key}` : "actions.unknown";
        const deleted = row.action.endsWith(".deleted");
        const href = !deleted && row.entityId && HREF[row.entityType] ? `${HREF[row.entityType]}/${row.entityId}` : null;
        const stage = typeof row.meta?.stage === "string" && (row.action === "deal.stage_changed" || row.action === "deal.won" || row.action === "deal.lost") ? row.meta.stage : null;
        const value = typeof row.meta?.value === "number" && row.action.startsWith("deal.") ? row.meta.value : null;
        return (
          <li key={row.id} className="relative flex gap-3 pb-5 last:pb-0">
            {i < rows.length - 1 && <span aria-hidden className="absolute start-4 top-9 bottom-1 w-px bg-line" />}
            <Avatar name={row.actorName ?? t("system")} hue={row.actorHue} />
            <div className="min-w-0 flex-1 pt-0.5 text-sm leading-relaxed">
              <p className="text-ink-2">
                <span className="font-medium text-ink">{row.actorName ?? t("system")}</span> {t(actionKey)}{" "}
                {href ? (
                  <Link href={href} className="font-medium text-ink underline decoration-line-strong underline-offset-4 hover:decoration-primary">
                    {row.entityLabel}
                  </Link>
                ) : (
                  <span className="font-medium text-ink">{row.entityLabel}</span>
                )}
                {stage && <span className="text-muted"> {t("toStage", { stage: sn(stage) })}</span>}
              </p>
              <p className="mt-0.5 flex items-center gap-2 text-xs text-muted">
                <time dateTime={row.createdAt.toISOString()}>{formatRelative(row.createdAt, locale)}</time>
                {value !== null && <span className="tabular">· {formatMoney(value, locale)}</span>}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
