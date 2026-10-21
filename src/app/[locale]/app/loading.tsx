import { Skeleton } from "@/components/ui/misc";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6" aria-busy>
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-10 w-32 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-32 rounded-[18px]" />
        ))}
      </div>
      <Skeleton className="h-[420px] rounded-[18px]" />
    </div>
  );
}
