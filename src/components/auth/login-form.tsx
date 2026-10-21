"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, Crown, ShieldCheck, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/lib/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { useAction } from "@/hooks/use-action";
import { demoLoginAction, loginAction } from "@/server/actions/auth";
import { cn } from "@/lib/utils/cn";

type Role = "admin" | "manager" | "rep";

const ROLES: Array<{ role: Role; icon: typeof Crown }> = [
  { role: "admin", icon: Crown },
  { role: "manager", icon: ShieldCheck },
  { role: "rep", icon: UserRound },
];

/** Only allow same-site relative redirects. */
function safeNext(value: string | null) {
  if (!value || !value.startsWith("/app") || value.startsWith("//")) return "/app";
  return value;
}

export function LoginForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const reduce = useReducedMotion();
  const p = useId();
  const { run, pending, fieldErrors } = useAction();
  const [activeRole, setActiveRole] = useState<Role | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const tErr = useTranslations("errors");

  const onSuccess = (data: { name: string }) => {
    toast.success(t("signedIn", { name: data.name }));
    router.replace(next);
    router.refresh();
  };

  return (
    <div className="w-full max-w-[440px]">
      <h1 className="text-[32px] font-semibold leading-tight tracking-[-0.02em] text-ink">{t("title")}</h1>
      <p className="mt-2 text-[15px] text-muted">{t("subtitle")}</p>

      <section aria-labelledby={`${p}demo`} className="mt-8">
        <h2 id={`${p}demo`} className="text-sm font-semibold text-ink">
          {t("demoTitle")}
        </h2>
        <p className="mt-1 text-sm text-muted">{t("demoSubtitle")}</p>
        <div className="mt-4 flex flex-col gap-2.5">
          {ROLES.map(({ role, icon: Icon }, i) => (
            <motion.button
              key={role}
              type="button"
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.07, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              disabled={pending}
              onClick={() => {
                setActiveRole(role);
                void run(() => demoLoginAction(role), { onSuccess, onError: () => setActiveRole(null) });
              }}
              className={cn(
                "group flex items-center gap-4 rounded-[16px] border border-line bg-surface p-4 text-start shadow-1 transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-2 disabled:opacity-60",
                activeRole === role && "border-primary ring-4 ring-ring/30",
              )}
            >
              <span
                className={cn(
                  "grid size-11 shrink-0 place-items-center rounded-[12px]",
                  role === "admin" ? "bg-saffron-soft text-saffron" : role === "manager" ? "bg-iris-soft text-iris" : "bg-primary-soft text-primary",
                )}
              >
                <Icon className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold text-ink">{t("demoAs", { role: t(role) })}</span>
                <span className="block truncate text-[13px] text-muted">{t(`${role}Hint`)}</span>
              </span>
              {activeRole === role && pending ? (
                <span className="size-5 animate-spin rounded-full border-2 border-line border-t-primary" aria-hidden />
              ) : (
                <ArrowRight className="size-5 text-muted transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
              )}
            </motion.button>
          ))}
        </div>
      </section>

      <div className="my-8 flex items-center gap-4 text-xs text-muted">
        <span className="h-px flex-1 bg-line" />
        {t("orManual")}
        <span className="h-px flex-1 bg-line" />
      </div>

      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          setFormError(null);
          const fd = new FormData(e.currentTarget);
          setActiveRole(null);
          void run(() => loginAction(fd), {
            onSuccess,
            onError: (err) => setFormError(err === "validation" ? null : tErr.has(err) ? tErr(err) : tErr("server_error")),
          });
        }}
      >
        <Field label={t("email")} htmlFor={`${p}email`} error={fieldErrors.email}>
          <Input id={`${p}email`} name="email" type="email" autoComplete="username" dir="ltr" defaultValue="admin@nexora.demo" />
        </Field>
        <Field label={t("password")} htmlFor={`${p}pw`} error={fieldErrors.password}>
          <Input id={`${p}pw`} name="password" type="password" autoComplete="current-password" dir="ltr" />
        </Field>
        {formError && (
          <p role="alert" className="rounded-xl bg-rose-soft px-3 py-2 text-sm text-rose">
            {formError}
          </p>
        )}
        <Button type="submit" size="lg" loading={pending && activeRole === null}>
          {t("signIn")}
        </Button>
        <p className="text-center text-xs text-muted">
          {t("credentials", { password: "demo1234" })}
        </p>
      </form>
    </div>
  );
}
