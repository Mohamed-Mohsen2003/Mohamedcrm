"use client";

import { useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Ellipsis, UserPlus } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/field";
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { useWorkspace } from "@/components/shared/workspace-context";
import { useAction } from "@/hooks/use-action";
import { inviteMemberAction, updateMemberAction } from "@/server/actions/workspace";
import { formatMoney, formatRelative } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { getTeam } from "@/server/queries/insights";

type Member = Awaited<ReturnType<typeof getTeam>>[number];
const ROLE_TONE = { admin: "saffron", manager: "iris", rep: "jade" } as const;

export function InviteMember() {
  const t = useTranslations();
  const p = useId();
  const [open, setOpen] = useState(false);
  const { run, pending, fieldErrors: e } = useAction();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)}>
        <UserPlus />
        {t("team.invite")}
      </Button>
      <DialogContent title={t("team.invite")} description={t("team.inviteDescription")} closeLabel={t("common.close")}>
        <form
          noValidate
          onSubmit={(ev) => {
            ev.preventDefault();
            const fd = new FormData(ev.currentTarget);
            void run(() => inviteMemberAction(fd), { onSuccess: () => setOpen(false) });
          }}
        >
          <div className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2">
            <Field label={t("common.name")} htmlFor={`${p}n`} error={e.name} required>
              <Input id={`${p}n`} name="name" autoFocus />
            </Field>
            <Field label={t("common.email")} htmlFor={`${p}e`} error={e.email} required>
              <Input id={`${p}e`} name="email" type="email" dir="ltr" />
            </Field>
            <Field label={t("team.title_")} htmlFor={`${p}t`} error={e.title}>
              <Input id={`${p}t`} name="title" />
            </Field>
            <Field label={t("team.role")} htmlFor={`${p}r`} error={e.role}>
              <Select id={`${p}r`} name="role" defaultValue="rep">
                {(["rep", "manager", "admin"] as const).map((r) => (
                  <option key={r} value={r}>
                    {t(`enums.role.${r}`)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                {t("common.cancel")}
              </Button>
            </DialogClose>
            <Button type="submit" loading={pending}>
              {t("team.invite")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function TeamTable({ members }: { members: Member[] }) {
  const t = useTranslations();
  const locale = useLocale();
  const { user, can } = useWorkspace();
  const { run, pending } = useAction();
  const manage = can("team:manage");

  return (
    <div className="scrollbar-thin overflow-x-auto">
      <table className="w-full min-w-[820px] text-sm [&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
        <thead className="border-b border-line bg-surface-2/60 text-xs text-muted">
          <tr>
            <th className="px-5 py-3 text-start font-medium">{t("common.name")}</th>
            <th className="px-4 py-3 text-start font-medium">{t("team.role")}</th>
            <th className="px-4 py-3 text-end font-medium">{t("team.openDeals")}</th>
            <th className="px-4 py-3 text-end font-medium">{t("team.won90")}</th>
            <th className="px-4 py-3 text-start font-medium">{t("team.lastSeen")}</th>
            {manage && <th className="w-12 px-4 py-3" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {members.map((m) => (
            <tr key={m.id} className={cn("transition-colors hover:bg-surface-2", !m.isActive && "opacity-55")}>
              <td className="px-5 py-3">
                <div className="flex items-center gap-3">
                  <Avatar name={m.name} hue={m.avatarHue} size="md" />
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-medium text-ink">
                      {m.name}
                      {m.id === user.id && <span className="rounded-full bg-surface-3 px-2 py-0.5 text-[11px] text-muted">{t("team.you")}</span>}
                      {!m.isActive && <span className="rounded-full bg-rose-soft px-2 py-0.5 text-[11px] text-rose">{t("team.inactive")}</span>}
                    </p>
                    <p className="text-xs text-muted">
                      {m.title ? `${m.title} · ` : ""}
                      <span dir="ltr">{m.email}</span>
                    </p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <Badge tone={ROLE_TONE[m.role]}>{t(`enums.role.${m.role}`)}</Badge>
              </td>
              <td className="tabular px-4 py-3 text-end text-ink-2">{m.openDeals}</td>
              <td className="tabular px-4 py-3 text-end font-medium text-ink">{formatMoney(m.wonValue, locale)}</td>
              <td className="px-4 py-3 text-muted">{m.lastLoginAt ? formatRelative(m.lastLoginAt, locale) : t("team.never")}</td>
              {manage && (
                <td className="px-4 py-3">
                  {m.id !== user.id && (
                    <Menu>
                      <MenuTrigger asChild>
                        <button type="button" className="grid size-8 place-items-center rounded-full text-muted hover:bg-surface-3 hover:text-ink" aria-label={t("common.actions")} disabled={pending}>
                          <Ellipsis className="size-4" />
                        </button>
                      </MenuTrigger>
                      <MenuContent>
                        <MenuLabel>{t("team.changeRole")}</MenuLabel>
                        {(["admin", "manager", "rep"] as const).map((r) => (
                          <MenuItem key={r} disabled={m.role === r} onSelect={() => run(() => updateMemberAction(m.id, { role: r }))}>
                            <Badge tone={ROLE_TONE[r]}>{t(`enums.role.${r}`)}</Badge>
                          </MenuItem>
                        ))}
                        <MenuSeparator />
                        <MenuItem tone={m.isActive ? "danger" : undefined} onSelect={() => run(() => updateMemberAction(m.id, { isActive: !m.isActive }))}>
                          {m.isActive ? t("team.deactivate") : t("team.activate")}
                        </MenuItem>
                      </MenuContent>
                    </Menu>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
