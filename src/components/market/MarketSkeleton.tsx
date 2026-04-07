import { Skeleton } from '@/components/ui/skeleton';

export function ItemCardSkeleton() {
  return (
    <div className="flex items-start gap-3 p-3.5 rounded-2xl border border-border/60 animate-pulse">
      <Skeleton className="w-14 h-14 rounded-2xl flex-shrink-0" />
      <div className="flex-1 space-y-2 py-0.5">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-2.5 w-32" />
        <Skeleton className="h-2.5 w-20" />
      </div>
      <div className="space-y-2 pt-0.5">
        <Skeleton className="h-6 w-14 rounded-xl" />
        <div className="flex gap-1.5">
          <Skeleton className="w-7 h-7 rounded-full" />
          <Skeleton className="w-7 h-7 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function HeroSkeleton() {
  return (
    <Skeleton className="h-28 w-full rounded-2xl" />
  );
}

export function QuickActionsSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-24" />
      <div className="flex gap-2">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-12 w-28 rounded-xl flex-shrink-0" />
        ))}
      </div>
    </div>
  );
}

export function CategorySidebarSkeleton() {
  return (
    <div className="w-20 space-y-2 p-2">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <div key={i} className="flex flex-col items-center gap-1 py-3">
          <Skeleton className="w-8 h-8 rounded-lg" />
          <Skeleton className="h-2 w-10" />
        </div>
      ))}
    </div>
  );
}

export function GridSkeleton({ cols = 2, count = 4 }: { cols?: number; count?: number }) {
  return (
    <div className={`grid grid-cols-${cols} gap-2`}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-24 rounded-xl" />
      ))}
    </div>
  );
}

export function DealsSkeleton() {
  return (
    <div className="space-y-6 px-4 pt-4">
      <Skeleton className="h-20 w-full rounded-2xl" />
      <div className="space-y-3">
        <Skeleton className="h-4 w-32" />
        <div className="flex gap-2">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24 w-24 rounded-xl flex-shrink-0" />
          ))}
        </div>
      </div>
      <Skeleton className="h-32 w-full rounded-2xl" />
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
