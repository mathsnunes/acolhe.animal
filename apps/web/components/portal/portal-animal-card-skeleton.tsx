import { Skeleton } from '@/components/ui/skeleton';

/** Placeholder matching `PortalAnimalCard` (4:5 photo + meta/name/story) for the
 * portal's "loading more" batch, so the grid doesn't jump when a page arrives. */
export const PortalAnimalCardSkeleton = () => (
  <div className="flex flex-col overflow-hidden rounded-xl border border-line-soft bg-paper shadow-card">
    <Skeleton className="aspect-[4/5] w-full rounded-none" />
    <div className="flex flex-col gap-2.5 p-5">
      <Skeleton className="h-2.5 w-24" />
      <Skeleton className="h-6 w-2/3" />
      <Skeleton className="mt-1 h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
    </div>
  </div>
);
