import { defineRouting } from "next-intl/routing";

export const locales = ["en", "ar"] as const;
export type Locale = (typeof locales)[number];

export const routing = defineRouting({
  locales,
  defaultLocale: "en",
  localePrefix: "as-needed",
});

export const rtlLocales: readonly Locale[] = ["ar"];
export const dirFor = (locale: string) => (rtlLocales.includes(locale as Locale) ? "rtl" : "ltr");
