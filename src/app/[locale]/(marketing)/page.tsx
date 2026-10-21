import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  ArrowRight,
  CalendarCheck,
  ChartColumnBig,
  Check,
  Languages,
  Magnet,
  ShieldCheck,
  SquareKanban,
} from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { Logo } from "@/components/layout/logo";
import { PipelinePreview } from "@/components/landing/pipeline-preview";
import { LandingNav } from "@/components/landing/landing-nav";
import { routing } from "@/lib/i18n/routing";
import { SITE_URL, GITHUB_URL, AUTHOR } from "@/lib/site";
import { cn } from "@/lib/utils/cn";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  const path = locale === routing.defaultLocale ? "/" : `/${locale}`;
  return {
    title: { absolute: t("title") },
    description: t("description"),
    alternates: {
      canonical: path,
      languages: { en: "/", ar: "/ar", "x-default": "/" },
    },
    openGraph: {
      type: "website",
      url: path,
      siteName: t("siteName"),
      title: t("title"),
      description: t("description"),
      locale: locale === "ar" ? "ar_EG" : "en_US",
      alternateLocale: locale === "ar" ? ["en_US"] : ["ar_EG"],
    },
    twitter: { card: "summary_large_image", title: t("title"), description: t("description") },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
  };
}

const FEATURES = [
  { key: "pipeline", icon: SquareKanban },
  { key: "leads", icon: Magnet },
  { key: "activities", icon: CalendarCheck },
  { key: "reports", icon: ChartColumnBig },
  { key: "roles", icon: ShieldCheck },
  { key: "bilingual", icon: Languages },
] as const;

export default async function LandingPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Nexora CRM",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: `${SITE_URL}${locale === "en" ? "" : `/${locale}`}`,
      description: t("meta.description"),
      inLanguage: ["en", "ar"],
      author: { "@type": "Person", name: AUTHOR.name, url: AUTHOR.url },
      offers: [
        { "@type": "Offer", name: t("landing.plans.starter.name"), price: "12", priceCurrency: "USD" },
        { "@type": "Offer", name: t("landing.plans.growth.name"), price: "29", priceCurrency: "USD" },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: (["1", "2", "3", "4"] as const).map((n) => ({
        "@type": "Question",
        name: t(`landing.faq.q${n}`),
        acceptedAnswer: { "@type": "Answer", text: t(`landing.faq.a${n}`) },
      })),
    },
  ];

  const stats = [
    { value: "150+", label: t("landing.stats.deals") },
    { value: "130+", label: t("landing.stats.contacts") },
    { value: "500+", label: t("landing.stats.activities") },
    { value: "2", label: t("landing.stats.languages") },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <LandingNav />

      <main id="main">
        {/* Hero ----------------------------------------------------------- */}
        <section className="relative overflow-hidden">
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[640px] [background:radial-gradient(60%_50%_at_75%_10%,color-mix(in_oklab,var(--primary)_14%,transparent),transparent_70%)]" />
          <div className="relative mx-auto grid max-w-[1240px] grid-cols-1 items-center gap-12 px-5 pb-20 pt-14 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)] lg:pb-28 lg:pt-20">
            <div className="landing-rise">
              <h1 className="text-balance text-[clamp(2.4rem,5.2vw,4.1rem)] font-semibold leading-[1.04] tracking-[-0.035em] text-ink">{t("landing.heroTitle")}</h1>
              <p className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-muted">{t("landing.heroBody")}</p>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Link href="/login" className="group inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 text-[15px] font-semibold text-primary-ink shadow-2 transition hover:bg-primary-strong">
                  {t("landing.heroPrimary")}
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
                </Link>
                <a href="#workflow" className="inline-flex h-12 items-center rounded-full border border-line-strong px-6 text-[15px] font-medium text-ink transition hover:bg-surface">
                  {t("landing.heroSecondary")}
                </a>
              </div>
              <p className="mt-5 text-sm text-muted">{t("landing.heroNote")}</p>
            </div>

            <div className="landing-rise [animation-delay:120ms]">
              <div className="relative rounded-[28px] bg-sidebar p-5 shadow-pop ring-1 ring-black/5 sm:p-7">
                <div aria-hidden className="absolute inset-0 rounded-[28px] opacity-40 [background-image:radial-gradient(circle_at_1px_1px,var(--sidebar-active)_1px,transparent_0)] [background-size:20px_20px]" />
                <div className="relative mb-5 flex items-center gap-2">
                  <span className="size-2.5 rounded-full bg-white/15" />
                  <span className="size-2.5 rounded-full bg-white/15" />
                  <span className="size-2.5 rounded-full bg-white/15" />
                  <span className="ms-3 text-xs font-medium text-sidebar-muted">{t("landing.preview.board")}</span>
                </div>
                <PipelinePreview
                  className="relative"
                  labels={{
                    stages: [t("landing.preview.qualification"), t("landing.preview.proposal"), t("landing.preview.negotiation"), t("landing.preview.won")],
                    won: t("landing.preview.won"),
                    thisMonth: t("landing.preview.thisMonth"),
                  }}
                />
              </div>
            </div>
          </div>
          <p className="mx-auto max-w-[1240px] border-t border-line px-5 py-6 text-center text-sm text-muted sm:px-8">{t("landing.trusted")}</p>
        </section>

        {/* Features ------------------------------------------------------- */}
        <section id="features" className="scroll-mt-20 bg-surface py-24">
          <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.5fr)] lg:gap-16">
              <div className="lg:sticky lg:top-28 lg:self-start">
                <h2 className="text-balance text-[clamp(1.9rem,3.4vw,2.75rem)] font-semibold leading-[1.1] tracking-[-0.03em]">{t("landing.featuresTitle")}</h2>
                <p className="mt-4 max-w-md text-pretty text-[17px] leading-relaxed text-muted">{t("landing.featuresBody")}</p>
              </div>
              <ul className="grid grid-cols-1 border-t border-line sm:grid-cols-2">
                {FEATURES.map(({ key, icon: Icon }, i) => (
                  <li key={key} className={cn("border-b border-line py-8 sm:pe-8", i % 2 === 1 && "sm:border-s sm:ps-8 sm:pe-0")}>
                    <Icon className="size-6 text-primary" aria-hidden />
                    <h3 className="mt-4 text-lg font-semibold tracking-tight">{t(`landing.features.${key}.title`)}</h3>
                    <p className="mt-2 text-pretty leading-relaxed text-muted">{t(`landing.features.${key}.body`)}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Workflow ------------------------------------------------------- */}
        <section id="workflow" className="scroll-mt-20 py-24">
          <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
            <h2 className="max-w-2xl text-balance text-[clamp(1.9rem,3.4vw,2.75rem)] font-semibold leading-[1.1] tracking-[-0.03em]">{t("landing.workflowTitle")}</h2>
            <ol className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3">
              {(["capture", "qualify", "close"] as const).map((step, i) => (
                <li key={step} className="relative rounded-[22px] border border-line bg-surface p-7 shadow-1">
                  <span className="tabular text-sm font-semibold text-primary">0{i + 1}</span>
                  <h3 className="mt-3 text-xl font-semibold tracking-tight">{t(`landing.workflowSteps.${step}.title`)}</h3>
                  <p className="mt-2 text-pretty leading-relaxed text-muted">{t(`landing.workflowSteps.${step}.body`)}</p>
                  {i < 2 && (
                    <ArrowRight aria-hidden className="absolute -end-3.5 top-1/2 z-10 hidden size-7 -translate-y-1/2 rounded-full border border-line bg-bg p-1.5 text-muted md:block rtl:rotate-180" />
                  )}
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Demo numbers --------------------------------------------------- */}
        <section className="bg-sidebar py-20 text-white">
          <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
            <h2 className="text-sm font-medium text-sidebar-muted">{t("landing.statsTitle")}</h2>
            <dl className="mt-8 grid grid-cols-2 gap-y-10 lg:grid-cols-4">
              {stats.map((s) => (
                <div key={s.label} className="flex flex-col border-s border-white/10 ps-6">
                  <dt className="order-2 mt-2 text-sm text-sidebar-ink/80">{s.label}</dt>
                  <dd className="tabular text-[clamp(2.4rem,4.5vw,3.5rem)] font-semibold leading-none tracking-[-0.03em]">{s.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Pricing -------------------------------------------------------- */}
        <section id="pricing" className="scroll-mt-20 py-24">
          <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <h2 className="text-balance text-[clamp(1.9rem,3.4vw,2.75rem)] font-semibold leading-[1.1] tracking-[-0.03em]">{t("landing.pricingTitle")}</h2>
              <p className="text-sm text-muted">{t("landing.pricingBody")}</p>
            </div>
            <ul className="mt-12 grid grid-cols-1 gap-4 lg:grid-cols-3">
              {(["starter", "growth", "scale"] as const).map((plan) => {
                const featured = plan === "growth";
                return (
                  <li
                    key={plan}
                    className={cn(
                      "flex flex-col rounded-[24px] border p-7",
                      featured ? "border-transparent bg-sidebar text-white shadow-pop" : "border-line bg-surface shadow-1",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">{t(`landing.plans.${plan}.name`)}</h3>
                      {featured && <span className="rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-primary-ink">{t("landing.plans.growth.badge")}</span>}
                    </div>
                    <p className={cn("mt-2 text-sm", featured ? "text-sidebar-ink/80" : "text-muted")}>{t(`landing.plans.${plan}.body`)}</p>
                    <p className="mt-6 flex items-baseline gap-2">
                      <span className="tabular text-[42px] font-semibold leading-none tracking-[-0.03em]">{t(`landing.plans.${plan}.price`)}</span>
                      {plan !== "scale" && <span className={cn("text-sm", featured ? "text-sidebar-muted" : "text-muted")}>{t("landing.perSeat")}</span>}
                    </p>
                    <ul className="mt-6 flex flex-1 flex-col gap-3 text-sm">
                      {(["f1", "f2", "f3"] as const).map((f) => (
                        <li key={f} className="flex items-center gap-2.5">
                          <Check className={cn("size-4 shrink-0", featured ? "text-primary" : "text-primary")} />
                          {t(`landing.plans.${plan}.${f}`)}
                        </li>
                      ))}
                    </ul>
                    <Link
                      href="/login"
                      className={cn(
                        "mt-8 inline-flex h-11 items-center justify-center rounded-full text-sm font-semibold transition",
                        featured ? "bg-primary text-primary-ink hover:bg-primary-strong" : "border border-line-strong text-ink hover:bg-surface-2",
                      )}
                    >
                      {t("landing.choosePlan", { plan: t(`landing.plans.${plan}.name`) })}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* FAQ ------------------------------------------------------------ */}
        <section id="faq" className="scroll-mt-20 bg-surface py-24">
          <div className="mx-auto grid max-w-[1240px] grid-cols-1 gap-10 px-5 sm:px-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.5fr)] lg:gap-16">
            <h2 className="text-balance text-[clamp(1.9rem,3.4vw,2.75rem)] font-semibold leading-[1.1] tracking-[-0.03em]">{t("landing.faqTitle")}</h2>
            <div className="divide-y divide-line border-y border-line">
              {(["1", "2", "3", "4"] as const).map((n) => (
                <details key={n} className="group py-5 [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-start text-[17px] font-medium">
                    {t(`landing.faq.q${n}`)}
                    <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full border border-line text-muted transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 max-w-2xl text-pretty leading-relaxed text-muted">{t(`landing.faq.a${n}`)}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA ------------------------------------------------------------ */}
        <section className="py-24">
          <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
            <div className="relative overflow-hidden rounded-[32px] bg-primary px-8 py-16 text-primary-ink sm:px-14">
              <div aria-hidden className="absolute -end-24 -top-24 size-96 rounded-full border border-white/20" />
              <div aria-hidden className="absolute -end-10 -top-10 size-64 rounded-full border border-white/20" />
              <h2 className="relative max-w-2xl text-balance text-[clamp(1.9rem,3.6vw,3rem)] font-semibold leading-[1.08] tracking-[-0.03em]">{t("landing.ctaTitle")}</h2>
              <p className="relative mt-4 max-w-xl text-lg opacity-90">{t("landing.ctaBody")}</p>
              <Link href="/login" className="group relative mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-[15px] font-semibold text-[#0b3a31] transition hover:bg-white/90">
                {t("landing.heroPrimary")}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-6 px-5 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="flex items-center gap-3">
            <Logo />
            <p className="text-sm text-muted">{t("landing.footer")}</p>
          </div>
          <nav className="flex flex-wrap gap-6 text-sm" aria-label="Footer">
            <a href={GITHUB_URL} className="text-ink-2 hover:text-primary" rel="noopener" target="_blank">
              {t("landing.footerLinks.github")}
            </a>
            <Link href="/login" className="text-ink-2 hover:text-primary">
              {t("landing.footerLinks.demo")}
            </Link>
            <Link href="/" locale={locale === "ar" ? "en" : "ar"} className="text-ink-2 hover:text-primary" hrefLang={locale === "ar" ? "en" : "ar"}>
              {locale === "ar" ? "English" : "العربية"}
            </Link>
          </nav>
        </div>
      </footer>
    </>
  );
}
