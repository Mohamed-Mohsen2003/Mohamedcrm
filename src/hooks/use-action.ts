"use client";

import { useCallback, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { ActionResult, FieldErrors } from "@/lib/validation/result";

/**
 * Runs a server action inside a transition and turns its result into toasts.
 * Field errors are returned translated so forms can render them inline.
 */
export function useAction() {
  const [pending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const tToast = useTranslations("toasts");
  const tErr = useTranslations("errors");

  const translateErrors = useCallback(
    (errors: FieldErrors = {}) =>
      Object.fromEntries(Object.entries(errors).map(([k, v]) => [k, tErr.has(v) ? tErr(v) : tErr("invalid")])) as FieldErrors,
    [tErr],
  );

  const run = useCallback(
    <T,>(fn: () => Promise<ActionResult<T>>, opts: { silent?: boolean; onSuccess?: (data: T) => void; onError?: (error: string) => void } = {}) =>
      new Promise<ActionResult<T>>((resolve) => {
        startTransition(async () => {
          let result: ActionResult<T>;
          try {
            result = await fn();
          } catch {
            result = { ok: false, error: "network_error" };
          }
          if (result.ok) {
            setFieldErrors({});
            if (!opts.silent && result.message) toast.success(tToast.has(result.message) ? tToast(result.message) : result.message);
            opts.onSuccess?.(result.data);
          } else {
            setFieldErrors(translateErrors(result.fieldErrors));
            if (result.error !== "validation" || !result.fieldErrors) {
              toast.error(tErr.has(result.error) ? tErr(result.error) : tErr("server_error"));
            }
            opts.onError?.(result.error);
          }
          resolve(result);
        });
      }),
    [tToast, tErr, translateErrors],
  );

  return { run, pending, fieldErrors, setFieldErrors };
}
