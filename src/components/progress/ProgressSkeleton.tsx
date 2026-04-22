import { Skeleton } from '@/components/ui/skeleton';

/**
 * Loading placeholder for the Progress page while profile + logs hydrate.
 */
export default function ProgressSkeleton() {
  return (
    <div className="min-h-screen pb-24 bg-background">
      <div className="max-w-lg mx-auto px-4 pt-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-8 w-28 rounded-xl" />
        </div>

        {/* Weight progress arc */}
        <div className="rounded-3xl bg-card border border-border p-5 space-y-4">
          <div className="flex justify-center">
            <Skeleton className="w-40 h-40 rounded-full" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-12 rounded-xl" />
            <Skeleton className="h-12 rounded-xl" />
          </div>
        </div>

        {/* Week strip */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-xl" />
            ))}
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>

        {/* Calendar block */}
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </div>
  );
}
