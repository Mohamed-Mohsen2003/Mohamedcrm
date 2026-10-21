"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("errors");
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <EmptyState
      className="min-h-[60vh]"
      icon={<TriangleAlert />}
      title={t("errorTitle")}
      description={t("errorBody")}
      action={<Button onClick={reset}>{t("retry")}</Button>}
    />
  );
}
