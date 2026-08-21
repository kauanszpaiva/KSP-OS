import { Skeleton } from '@ksp/ui';

/** Shared route fallback that mirrors the compact operational hierarchy instead
 * of flashing the old oversized header/card stack during navigation. */
export default function Loading() {
  return (
    <div className="animate-fade-in" aria-busy="true" aria-label="Loading">
      <div className="mb-5 flex flex-col gap-3 border-b border-line pb-4 md:mb-6 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <Skeleton className="hidden h-2.5 w-20 sm:block" />
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-3 w-64 max-w-full" />
        </div>
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>

      <div className="mb-5 grid grid-cols-2 gap-2.5 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-line bg-surface p-3 shadow-card sm:p-4">
            <Skeleton className="h-2.5 w-14" />
            <Skeleton className="mt-2.5 h-6 w-16" />
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 border-t border-line px-3 py-3 first:border-t-0 sm:px-4">
            <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-1/3 min-w-24" />
              <Skeleton className="h-2.5 w-1/2 min-w-32" />
            </div>
            <Skeleton className="h-5 w-16 shrink-0 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
