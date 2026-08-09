import { Skeleton } from "@/components/ui/skeleton";

// ── Reusable skeleton layouts matching Haven's component patterns ──

export function MetricCardSkeleton() {
  return (
    <div className="rounded-2xl border border-white/10 bg-black p-4 sm:p-5">
      <Skeleton className="h-9 w-9 rounded-lg mb-3" />
      <Skeleton className="h-8 w-20 mb-1" />
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-2 w-16 mt-1" />
    </div>
  );
}

export function StatGridSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <MetricCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ChartSkeleton({ height = 280 }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black p-4">
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-16 rounded-md" />
      </div>
      <Skeleton className="w-full rounded-md" style={{ height }} />
    </div>
  );
}

export function ListRowSkeleton({ count = 4 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl border border-white/10 bg-black p-4">
          <Skeleton className="h-6 w-6 rounded-md shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-2 w-20" />
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

export function CourseCardSkeleton({ count = 3 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-white/10 bg-black p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-2 w-24" />
            </div>
          </div>
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-2 w-3/4" />
          <div className="flex gap-2 pt-1">
            <Skeleton className="h-6 w-16 rounded-md" />
            <Skeleton className="h-6 w-12 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}