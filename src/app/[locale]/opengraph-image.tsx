import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getTranslations } from "next-intl/server";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Nexora CRM";

export default async function OpenGraphImage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "landing" });
  // Satori needs a static (non-variable) font, so a 600-weight instance ships alongside the web fonts.
  const font = await readFile(path.join(process.cwd(), "src/assets/readex-semibold.ttf"));
  const rtl = locale === "ar";
  const columns = [
    { name: t("preview.qualification"), color: "#9b8cf0", cards: 2 },
    { name: t("preview.proposal"), color: "#f4b73a", cards: 1 },
    { name: t("preview.negotiation"), color: "#f2825f", cards: 2 },
    { name: t("preview.won"), color: "#2cc48f", cards: 3 },
  ];
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: rtl ? "row-reverse" : "row", background: "#0c2b27", fontFamily: "Readex", padding: 64, gap: 48 }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 560, alignItems: rtl ? "flex-end" : "flex-start" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: "#12936b", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
                <path d="M5 18V6l14 12V6" stroke="white" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span style={{ color: "white", fontSize: 34, fontWeight: 600 }}>Nexora CRM</span>
          </div>
          <div style={{ color: "white", fontSize: rtl ? 52 : 58, fontWeight: 600, lineHeight: rtl ? 1.3 : 1.08, letterSpacing: rtl ? 0 : -1.5, textAlign: rtl ? "right" : "left", display: "flex" }}>
            {t("heroTitle")}
          </div>
          {/* Satori has no bidi line-breaking, so the multi-phrase note is shown for LTR only. */}
          <div style={{ color: "#7fa39a", fontSize: 24, display: "flex" }}>{rtl ? "nexora · CRM" : t("heroNote")}</div>
        </div>
        <div style={{ flex: 1, display: "flex", gap: 12, background: "rgba(255,255,255,0.04)", borderRadius: 28, padding: 20, flexDirection: rtl ? "row-reverse" : "row" }}>
          {columns.map((c) => (
            <div key={c.name} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#cfe3dd", fontSize: 16 }}>
                <div style={{ width: 10, height: 10, borderRadius: 10, background: c.color }} />
                {c.name}
              </div>
              {Array.from({ length: c.cards }, (_, i) => (
                <div key={i} style={{ height: 86, borderRadius: 14, background: "#12372f", border: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", padding: 14, gap: 10 }}>
                  <div style={{ height: 10, width: "70%", borderRadius: 6, background: "rgba(255,255,255,0.5)" }} />
                  <div style={{ height: 8, width: "45%", borderRadius: 6, background: "rgba(255,255,255,0.2)" }} />
                  <div style={{ height: 10, width: "35%", borderRadius: 6, background: c.color }} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "Readex", data: font, weight: 600, style: "normal" }],
    },
  );
}
