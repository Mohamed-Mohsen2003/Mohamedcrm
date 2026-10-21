import { getTranslations } from "next-intl/server";
import { SearchX } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { Logo } from "@/components/layout/logo";

export default async function NotFound() {
  const t = await getTranslations("errors");
  return (
    <main className="grid min-h-dvh place-items-center px-6 text-center">
      <div className="flex flex-col items-center">
        <Logo className="mb-8" />
        <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary">
          <SearchX className="size-7" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("notFoundTitle")}</h1>
        <p className="mt-2 max-w-sm text-muted">{t("notFoundBody")}</p>
        <Link href="/" className="mt-6 inline-flex h-11 items-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-ink hover:bg-primary-strong">
          Nexora
        </Link>
      </div>
    </main>
  );
}
