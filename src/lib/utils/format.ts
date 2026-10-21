/** Locale-aware formatting helpers shared by server and client components. */

// Arabic UI keeps Western digits so numbers stay consistent with ICU plurals and data.
export const intlLocale = (locale: string) => (locale === "ar" ? "ar-EG-u-nu-latn" : "en-US");

const CURRENCY_SYMBOL: Record<string, string> = { USD: "$", EUR: "€", GBP: "£" };

export function formatMoney(value: number, locale = "en", currency = "USD", opts: { compact?: boolean } = {}) {
  const symbol = CURRENCY_SYMBOL[currency];
  if (locale === "ar" && symbol) {
    // Arabic ICU renders "US$" after the number; keep the familiar "$1,234" order, isolated as LTR.
    const n = new Intl.NumberFormat(intlLocale(locale), {
      notation: opts.compact ? "compact" : "standard",
      minimumFractionDigits: 0,
      maximumFractionDigits: opts.compact ? 1 : 0,
    }).format(value);
    return `\u2066${symbol}${n}\u2069`;
  }
  return new Intl.NumberFormat(intlLocale(locale), {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    notation: opts.compact ? "compact" : "standard",
    minimumFractionDigits: 0,
    maximumFractionDigits: opts.compact ? 1 : 0,
  }).format(value);
}

export function formatNumber(value: number, locale = "en", opts: Intl.NumberFormatOptions = {}) {
  return new Intl.NumberFormat(intlLocale(locale), opts).format(value);
}

export function formatPercent(value: number, locale = "en") {
  return new Intl.NumberFormat(intlLocale(locale), { style: "percent", maximumFractionDigits: 0 }).format(value);
}

export function formatDate(value: Date | string | null | undefined, locale = "en", opts: Intl.DateTimeFormatOptions = { dateStyle: "medium" }) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(intlLocale(locale), { timeZone: "Africa/Cairo", ...opts }).format(date);
}

export function formatDateTime(value: Date | string | null | undefined, locale = "en") {
  return formatDate(value, locale, { dateStyle: "medium", timeStyle: "short" });
}

export function formatTime(value: Date | string | null | undefined, locale = "en") {
  return formatDate(value, locale, { hour: "numeric", minute: "2-digit" });
}

const UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ["year", 365 * 86_400],
  ["month", 30 * 86_400],
  ["week", 7 * 86_400],
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
];

export function formatRelative(value: Date | string | null | undefined, locale = "en", now: Date = new Date()) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  const diffSeconds = Math.round((date.getTime() - now.getTime()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(intlLocale(locale), { numeric: "auto" });
  for (const [unit, seconds] of UNITS) {
    if (Math.abs(diffSeconds) >= seconds) return rtf.format(Math.round(diffSeconds / seconds), unit);
  }
  return rtf.format(0, "minute");
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function fullName(person: { firstName: string; lastName: string }) {
  return `${person.firstName} ${person.lastName}`.trim();
}

/** Converts rows to RFC 4180 CSV. */
export function toCsv(rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]!);
  const escape = (value: unknown) => {
    if (value === null || value === undefined) return "";
    const text = value instanceof Date ? value.toISOString() : Array.isArray(value) ? value.join("; ") : String(value);
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [headers.join(","), ...rows.map((row) => headers.map((h) => escape(row[h])).join(","))].join("\r\n");
}

/** Whole days elapsed since `value`. */
export function daysSince(value: Date | string, now: Date = new Date()) {
  const date = typeof value === "string" ? new Date(value) : value;
  return Math.max(0, Math.round((now.getTime() - date.getTime()) / 86_400_000));
}
