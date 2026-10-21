"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { useStageName } from "@/hooks/use-stage-name";
import { ArrowRightLeft } from "lucide-react";
import { useRouter } from "@/lib/i18n/navigation";
import { Dialog, DialogClose, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select } from "@/components/ui/field";
import { useWorkspace } from "@/components/shared/workspace-context";
import { useAction } from "@/hooks/use-action";
import { convertLeadAction } from "@/server/actions/records";

export function ConvertLead({ lead }: { lead: { id: string; firstName: string; lastName: string; companyName: string | null; estimatedValue: number; ownerId: string | null } }) {
  const t = useTranslations();
  const router = useRouter();
  const p = useId();
  const sn = useStageName();
  const { lookups, canModify } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [createDeal, setCreateDeal] = useState(true);
  const { run, pending, fieldErrors: e } = useAction();
  if (!canModify(lead.ownerId)) return null;
  const openStages = lookups.stages.filter((s) => s.kind === "open");
  const name = `${lead.firstName} ${lead.lastName}`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)}>
        <ArrowRightLeft />
        {t("leads.convert")}
      </Button>
      <DialogContent title={t("leads.convertTitle", { name })} description={t("leads.convertDescription")} closeLabel={t("common.close")}>
        <form
          noValidate
          onSubmit={(ev) => {
            ev.preventDefault();
            const fd = new FormData(ev.currentTarget);
            fd.set("createDeal", createDeal ? "true" : "false");
            void run(() => convertLeadAction(lead.id, fd), {
              onSuccess: (r) => {
                setOpen(false);
                router.push(r.dealId ? `/app/deals/${r.dealId}` : `/app/contacts/${r.contactId}`);
              },
            });
          }}
        >
          <div className="flex flex-col gap-4 px-6 py-5">
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-line bg-surface-2 p-3.5 text-sm font-medium">
              <Checkbox checked={createDeal} onChange={(ev) => setCreateDeal(ev.target.checked)} />
              {t("leads.createDeal")}
            </label>
            {createDeal && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label={t("leads.dealTitle")} htmlFor={`${p}t`} error={e.dealTitle} className="sm:col-span-2">
                  <Input id={`${p}t`} name="dealTitle" defaultValue={`${lead.companyName ?? name} — New opportunity`} />
                </Field>
                <Field label={t("leads.dealValue")} htmlFor={`${p}v`} error={e.dealValue}>
                  <Input id={`${p}v`} name="dealValue" inputMode="numeric" dir="ltr" defaultValue={String(lead.estimatedValue || "")} />
                </Field>
                <Field label={t("leads.stage")} htmlFor={`${p}s`} error={e.stageId}>
                  <Select id={`${p}s`} name="stageId" defaultValue={openStages[0]?.id}>
                    {openStages.map((s) => (
                      <option key={s.id} value={s.id}>
                        {sn(s.name)}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                {t("common.cancel")}
              </Button>
            </DialogClose>
            <Button type="submit" loading={pending}>
              {t("leads.convertSubmit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
