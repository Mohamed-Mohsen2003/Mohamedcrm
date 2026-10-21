import { describe, expect, it } from "vitest";
import { formatMoney, formatRelative, initials, toCsv } from "@/lib/utils/format";

describe("formatting", () => {
  it("formats money compactly without trailing zeros", () => {
    expect(formatMoney(18_000, "en", "USD", { compact: true })).toBe("$18K");
    expect(formatMoney(1_432_500, "en", "USD", { compact: true })).toBe("$1.4M");
    expect(formatMoney(34_500, "en")).toBe("$34,500");
  });

  it("keeps a leading dollar sign and Western digits in Arabic", () => {
    const value = formatMoney(34_500, "ar");
    expect(value.replace(/[⁦⁩]/g, "")).toBe("$34,500");
  });

  it("formats relative time", () => {
    const now = new Date("2026-10-21T12:00:00Z");
    expect(formatRelative(new Date("2026-10-19T12:00:00Z"), "en", now)).toBe("2 days ago");
    expect(formatRelative(new Date("2026-10-21T12:00:10Z"), "en", now)).toBe("this minute");
  });

  it("builds initials", () => {
    expect(initials("Laila Haddad")).toBe("LH");
    expect(initials("  omar  ")).toBe("O");
  });

  it("escapes CSV values", () => {
    const csv = toCsv([{ name: 'Acme, "Inc"', tags: ["a", "b"], n: 3 }]);
    expect(csv).toBe('name,tags,n\r\n"Acme, ""Inc""",a; b,3');
  });
});
