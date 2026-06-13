import { Skeleton } from '@/components/ui/skeleton';

/**
 * Instant fallback shown while an admin page streams in. The sidebar (in the
 * layout) stays put; only the content area swaps to this skeleton — so navigation
 * feels immediate even while the server component resolves its data.
 */
export default function AdminLoading() {
  return (
    <div className="px-6 py-8 sm:px-10">
      <Skeleton className="mb-3 h-3 w-24" />
      <Skeleton className="mb-8 h-12 w-72 max-w-full" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
