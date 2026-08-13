import { Skeleton } from '@ksp/ui';

/**
 * Route-level loading fallback for every module under (app). Each page is an
 * async server component with `dynamic = 'force-dynamic'`, so navigation
 * previously showed a blank frame until the server responded. This mirrors the
 * common page shape — PageHeader, a stat row, and a list — with the existing
 * Skeleton shimmer, so module switches feel instant instead of empty.
 */
export default function Loading() {
  return (
    <div className="animate-fade-in" aria-busy="true" aria-label="Loading">
      {/* PageHeader frame */}
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
        <div className="space-y-2.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-3.5 w-80 max-w-full" />
        </div>
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>

      {/* Stat row */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-line bg-surface p-4 shadow-card">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="mt-3 h-7 w-20" />
          </div>
        ))}
      </div>

      {/* Content rows */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 rounded-xl border border-line bg-surface p-4 shadow-card">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-1/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
