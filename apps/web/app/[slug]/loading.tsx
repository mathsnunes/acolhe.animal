import { Skeleton } from '@/components/ui/skeleton';

/** Instant fallback for the public portal while it streams in. */
export default function PortalLoading() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-12 sm:px-6">
      <Skeleton className="mb-4 h-3 w-28" />
      <Skeleton className="mb-3 h-12 w-80 max-w-full" />
      <Skeleton className="mb-10 h-4 w-96 max-w-full" />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-72 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
