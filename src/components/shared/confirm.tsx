"use client";

import * as React from "react";
import { AlertDialog as A } from "radix-ui";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

type ConfirmProps = {
  trigger: React.ReactNode;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void | Promise<unknown>;
  pending?: boolean;
};

export function Confirm({ trigger, title, description, confirmLabel, onConfirm, pending }: ConfirmProps) {
  const t = useTranslations("common");
  const [open, setOpen] = React.useState(false);
  return (
    <A.Root open={open} onOpenChange={setOpen}>
      <A.Trigger asChild>{trigger}</A.Trigger>
      <A.Portal>
        <A.Overlay className="fixed inset-0 z-50 bg-[#06110f]/45 backdrop-blur-[2px] data-[state=open]:animate-[fade-in_160ms_ease-out]" />
        <A.Content className="fixed start-1/2 top-[22vh] z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 rounded-[var(--radius-panel)] border border-line bg-surface p-6 shadow-pop rtl:translate-x-1/2 data-[state=open]:animate-[dialog-in_240ms_cubic-bezier(0.2,0.9,0.3,1.15)]">
          <A.Title className="text-lg font-semibold tracking-tight">{title}</A.Title>
          <A.Description className="mt-2 text-sm leading-relaxed text-muted">{description}</A.Description>
          <div className="mt-6 flex justify-end gap-2">
            <A.Cancel asChild>
              <Button variant="secondary">{t("cancel")}</Button>
            </A.Cancel>
            <Button
              variant="danger"
              loading={pending}
              onClick={async () => {
                await onConfirm();
                setOpen(false);
              }}
            >
              {confirmLabel ?? t("delete")}
            </Button>
          </div>
        </A.Content>
      </A.Portal>
    </A.Root>
  );
}
