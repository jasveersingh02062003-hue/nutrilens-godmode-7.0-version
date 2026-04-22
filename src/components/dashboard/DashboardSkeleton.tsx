import { Skeleton } from '@/components/ui/skeleton';

/**
 * Loading placeholder shown while the dashboard profile/data hydrate.
 * Mirrors the real Dashboard layout (header → calorie ring → macros → meals)
 * so the perceived layout shift is minimal.
 */
export default function DashboardSkeleton() {
  return (
    <div className="min-h-screen pb-24 bg-background">
      <div className="max-w-lg mx-auto px-4 pt-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="w-11 h-11 rounded-full" />
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <Skeleton className="w-9 h-9 rounded-full" />
        </div>

        {/* Calorie ring card */}
        <div className="rounded-3xl bg-card border border-border p-5 space-y-4">
          <div className="flex justify-center">
            <Skeleton className="w-44 h-44 rounded-full" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-12 mx-auto" />
                <Skeleton className="h-5 w-16 mx-auto" />
              </div>
            ))}
          </div>
        </div>

        {/* Macro cards */}
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>

        {/* Today's meals strip */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-16 rounded-2xl" />
            ))}
          </div>
        </div>

        {/* Water + supplements row */}
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
