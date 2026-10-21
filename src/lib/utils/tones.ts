/** Maps semantic tone names to token-backed utility classes. */
export const TONES = {
  jade: { dot: "bg-primary", soft: "bg-primary-soft text-primary-strong", bar: "bg-primary", text: "text-primary" },
  saffron: { dot: "bg-saffron", soft: "bg-saffron-soft text-saffron", bar: "bg-saffron", text: "text-saffron" },
  coral: { dot: "bg-coral", soft: "bg-coral-soft text-coral", bar: "bg-coral", text: "text-coral" },
  iris: { dot: "bg-iris", soft: "bg-iris-soft text-iris", bar: "bg-iris", text: "text-iris" },
  sky: { dot: "bg-sky", soft: "bg-sky-soft text-sky", bar: "bg-sky", text: "text-sky" },
  rose: { dot: "bg-rose", soft: "bg-rose-soft text-rose", bar: "bg-rose", text: "text-rose" },
  slate: { dot: "bg-slate", soft: "bg-slate-soft text-slate", bar: "bg-slate", text: "text-slate" },
} as const;

export type Tone = keyof typeof TONES;

export const toneOf = (value: string | null | undefined): Tone =>
  value && value in TONES ? (value as Tone) : "slate";

/** CSS variable for chart fills, keyed by tone. */
export const toneVar = (tone: Tone) => `var(--${tone === "jade" ? "primary" : tone})`;

export const LEAD_STATUS_TONE = {
  new: "sky",
  contacted: "iris",
  qualified: "jade",
  unqualified: "slate",
  converted: "saffron",
} as const satisfies Record<string, Tone>;

export const LIFECYCLE_TONE = {
  lead: "sky",
  opportunity: "iris",
  customer: "jade",
  churned: "rose",
} as const satisfies Record<string, Tone>;

export const PRIORITY_TONE = { low: "slate", medium: "saffron", high: "coral" } as const satisfies Record<string, Tone>;

export const ACTIVITY_TONE = { call: "sky", email: "iris", meeting: "saffron", task: "jade" } as const satisfies Record<string, Tone>;
