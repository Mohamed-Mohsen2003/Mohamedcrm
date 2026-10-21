import { useTranslations } from "next-intl";

/** Default pipeline stages are stored in English; translate them when a translation exists. */
export function useStageName() {
  const t = useTranslations("stageNames");
  return (name: string | null | undefined) => (name && t.has(name) ? t(name) : (name ?? ""));
}
