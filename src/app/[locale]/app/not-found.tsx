import { getTranslations } from "next-intl/server";
import { SearchX } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";

export default async function AppNotFound() {
  const t = await getTranslations("errors");
  return (
    <EmptyState
      className="min-h-[60vh]"
      icon={<SearchX />}
      title={t("notFoundTitle")}
      description={t("notFoundBody")}
      action={
        <Button asChild>
          <Link href="/app">{t("goHome")}</Link>
        </Button>
      }
    />
  );
}
