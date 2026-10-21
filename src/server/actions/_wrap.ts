import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { AuthError, requireActor, type CurrentUser } from "@/lib/auth/session";
import type { Permission } from "@/lib/auth/permissions";
import { fail, fieldErrorsOf, formToObject, type ActionResult } from "@/lib/validation/result";

export class ActionError extends Error {}

/** Wraps a server action body with auth, permission checks and uniform error handling. */
export async function guarded<T>(permission: Permission | undefined, body: (actor: CurrentUser) => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    const actor = await requireActor(permission);
    const result = await body(actor);
    if (result.ok) revalidatePath("/[locale]/app", "layout");
    return result;
  } catch (error) {
    if (error instanceof AuthError) return fail(error.code);
    if (error instanceof ActionError) return fail(error.message);
    console.error("[action]", error);
    return fail("server_error");
  }
}

export function parseForm<S extends z.ZodType>(schema: S, formData: FormData): { data: z.infer<S> } | { error: ActionResult<never> } {
  const parsed = schema.safeParse(formToObject(formData));
  if (!parsed.success) return { error: fail("validation", fieldErrorsOf(parsed.error)) };
  return { data: parsed.data };
}
