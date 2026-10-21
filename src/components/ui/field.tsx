import * as React from "react";
import { cn } from "@/lib/utils/cn";

const control =
  "w-full rounded-[var(--radius-control)] border border-line bg-surface px-3 text-sm text-ink shadow-1 outline-none transition-[border-color,box-shadow] placeholder:text-muted/70 hover:border-line-strong focus:border-primary focus:ring-4 focus:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-rose aria-[invalid=true]:focus:ring-rose/20";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input data-slot="input" className={cn(control, "h-10", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea data-slot="textarea" className={cn(control, "min-h-24 resize-y py-2.5 leading-relaxed", className)} {...props} />;
}

export function Select({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <div className="relative">
      <select
        data-slot="select"
        className={cn(control, "h-10 cursor-pointer appearance-none pe-9", className)}
        {...props}
      >
        {children}
      </select>
      <svg
        aria-hidden
        viewBox="0 0 16 16"
        className="pointer-events-none absolute end-3 top-1/2 size-3.5 -translate-y-1/2 text-muted"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="m4 6 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

type FieldProps = {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
};

export function Field({ label, htmlFor, error, hint, required, className, children }: FieldProps) {
  const describedBy = error ? `${htmlFor}-error` : hint ? `${htmlFor}-hint` : undefined;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-ink-2">
        {label}
        {required && (
          <span className="ms-0.5 text-rose" aria-hidden>
            *
          </span>
        )}
      </label>
      {React.isValidElement<{ "aria-invalid"?: boolean; "aria-describedby"?: string }>(children)
        ? React.cloneElement(children, { "aria-invalid": Boolean(error) || undefined, "aria-describedby": describedBy })
        : children}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-xs text-rose" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function Checkbox({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type="checkbox"
      className={cn(
        "size-4 shrink-0 cursor-pointer appearance-none rounded-[5px] border border-line-strong bg-surface transition checked:border-primary checked:bg-primary checked:bg-[url(\"data:image/svg+xml,%3Csvg viewBox='0 0 16 16' fill='none' stroke='white' stroke-width='2.4' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='m4 8.5 2.5 2.5L12 5.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")] indeterminate:border-primary indeterminate:bg-primary focus-visible:ring-4 focus-visible:ring-ring/40",
        className,
      )}
      {...props}
    />
  );
}
