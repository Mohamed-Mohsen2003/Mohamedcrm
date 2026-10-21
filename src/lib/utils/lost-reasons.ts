/** Canonical (stored) lost reasons and their translation keys. */
export const LOST_REASONS = [
  { key: "price", value: "Price too high" },
  { key: "competitor", value: "Chose a competitor" },
  { key: "budget", value: "No budget this year" },
  { key: "noDecision", value: "No decision" },
  { key: "timing", value: "Timing" },
] as const;

export const lostReasonKey = (value: string | null | undefined) => LOST_REASONS.find((r) => r.value === value)?.key ?? null;
