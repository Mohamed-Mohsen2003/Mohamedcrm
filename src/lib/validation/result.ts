import type { z } from "zod";

export type FieldErrors = Record<string, string>;

export type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; fieldErrors?: FieldErrors };

export const ok = <T,>(data: T, message?: string): ActionResult<T> => ({ ok: true, data, message });
export const fail = (error: string, fieldErrors?: FieldErrors): ActionResult<never> => ({ ok: false, error, fieldErrors });

/** Flattens a Zod error into `{ field: messageKey }` — message keys are translated in the UI. */
export function fieldErrorsOf(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    if (out[key]) continue;
    out[key] = /^[a-z_]+$/.test(issue.message) ? issue.message : issue.code === "too_small" ? "required" : "invalid";
  }
  return out;
}

export function formToObject(formData: FormData) {
  const out: Record<string, FormDataEntryValue> = {};
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("$")) out[key] = value;
  }
  return out;
}
