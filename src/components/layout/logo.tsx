import { cn } from "@/lib/utils/cn";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("relative grid size-8 shrink-0 place-items-center overflow-hidden rounded-[10px] bg-primary", className)}>
      <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" aria-hidden>
        <path d="M5 18V6l14 12V6" stroke="white" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
