import { cn } from "@/lib/utils/cn";
import { initials } from "@/lib/utils/format";

const SIZES = { xs: "size-6 text-[10px]", sm: "size-8 text-xs", md: "size-10 text-sm", lg: "size-14 text-lg" } as const;

/** Initials avatar tinted from a stored hue — consistent per person without images. */
export function Avatar({ name, hue = 160, size = "sm", className }: { name: string; hue?: number | null; size?: keyof typeof SIZES; className?: string }) {
  const h = hue ?? 160;
  return (
    <span
      aria-hidden
      className={cn("inline-grid shrink-0 select-none place-items-center rounded-full font-semibold ring-2 ring-surface", SIZES[size], className)}
      style={{
        backgroundColor: `oklch(0.9 0.06 ${h})`,
        color: `oklch(0.38 0.1 ${h})`,
      }}
    >
      {initials(name) || "?"}
    </span>
  );
}

export function AvatarStack({ people, max = 4 }: { people: Array<{ name: string; hue?: number | null }>; max?: number }) {
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  return (
    <div className="flex -space-x-2 rtl:space-x-reverse">
      {shown.map((p) => (
        <Avatar key={p.name} name={p.name} hue={p.hue} size="xs" />
      ))}
      {rest > 0 && <span className="inline-grid size-6 place-items-center rounded-full bg-surface-3 text-[10px] font-semibold ring-2 ring-surface">+{rest}</span>}
    </div>
  );
}
