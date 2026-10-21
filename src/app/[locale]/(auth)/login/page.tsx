import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Check, ArrowLeft } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { PipelinePreview } from "@/components/landing/pipeline-preview";
import { Logo } from "@/components/layout/logo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });
  return { title: t("signIn"), description: t("demoSubtitle"), alternates: { canonical: locale === "en" ? "/login" : `/${locale}/login` } };
}

export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="flex flex-col px-6 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo />
            <span className="text-[17px] font-semibold tracking-tight">Nexora</span>
          </Link>
          <Link href="/" className="flex items-center gap-1.5 text-sm text-muted hover:text-ink">
            <ArrowLeft className="size-4 rtl:rotate-180" />
            {t("auth.backHome")}
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center py-10">
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </div>

      <aside className="relative hidden overflow-hidden bg-sidebar p-12 lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden className="absolute inset-0 opacity-[0.35] [background-image:radial-gradient(circle_at_1px_1px,var(--sidebar-active)_1px,transparent_0)] [background-size:22px_22px]" />
        <div className="relative max-w-lg">
          <h2 className="text-balance text-[34px] font-semibold leading-[1.15] tracking-[-0.02em] text-white">{t("auth.asideTitle")}</h2>
          <p className="mt-4 text-pretty text-[15px] leading-relaxed text-sidebar-ink/85">{t("auth.asideBody")}</p>
          <ul className="mt-6 flex flex-col gap-2.5">
            {(["p1", "p2", "p3"] as const).map((k) => (
              <li key={k} className="flex items-center gap-2.5 text-sm text-sidebar-ink">
                <span className="grid size-5 place-items-center rounded-full bg-primary/20 text-primary">
                  <Check className="size-3" />
                </span>
                {t(`auth.asidePoints.${k}`)}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative mt-10 rounded-[22px] border border-white/[0.07] bg-white/[0.03] p-5 backdrop-blur">
          <PipelinePreview
            labels={{
              stages: [t("landing.preview.qualification"), t("landing.preview.proposal"), t("landing.preview.negotiation"), t("landing.preview.won")],
              won: t("landing.preview.won"),
              thisMonth: t("landing.preview.thisMonth"),
            }}
          />
        </div>
      </aside>
    </div>
  );
}
