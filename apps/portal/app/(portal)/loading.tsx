import { Skeleton } from '@ksp/ui';

/**
 * Route-level loading fallback for every portal screen under (portal). Pages are
 * async server components (dynamic = 'force-dynamic'), so navigation previously
 * showed a blank frame. This mirrors the common portal shape — a left-bordered
 * header and a list of cards — with the shared Skeleton shimmer.
 */
export default function Loading() {
  return (
    <div className="animate-fade-in space-y-9" aria-busy="true" aria-label="Loading">
      <div className="space-y-2.5 border-l-2 border-brand pl-5">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-3.5 w-80 max-w-full" />
      </div>

      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3 shadow-card">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3.5 w-1/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
