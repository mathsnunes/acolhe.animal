import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { ANIMAL_ROW_COLS } from './animal-row';

/**
 * Loading placeholders for the animals listing — used both for the route-level
 * `loading.tsx` (first paint) and the "loading more" batch the infinite-scroll
 * container appends while fetching the next page. Mirrors the card/row shapes so
 * the layout doesn't jump when real data lands.
 */

export const AnimalCardSkeleton = () => (
  <div className="flex flex-col overflow-hidden rounded-lg border border-line bg-paper">
    <Skeleton className="aspect-[4/3] w-full rounded-none" />
    <div className="flex flex-col gap-2.5 px-4 pb-4 pt-3.5">
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="mt-2 h-4 w-16 rounded-full" />
    </div>
  </div>
);

export const AnimalRowSkeleton = () => (
  <div
    className={cn(
      'grid grid-cols-[56px_1fr] items-center gap-4 border-b border-line-soft px-4 py-3.5',
      ANIMAL_ROW_COLS,
    )}
  >
    <Skeleton className="size-14 rounded-[10px]" />
    <div className="flex flex-col gap-2">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-3 w-24 lg:hidden" />
    </div>
    <Skeleton className="hidden h-3 w-28 lg:block" />
    <Skeleton className="hidden h-3 w-20 lg:block" />
    <Skeleton className="hidden h-3 w-24 lg:block" />
    <Skeleton className="hidden h-3 w-16 lg:block" />
    <span className="hidden lg:block" />
  </div>
);

/** A grid of card skeletons (default/grid layout). */
export const AnimalsCardGridSkeleton = ({ count = 8 }: { count?: number }) => (
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-[18px] lg:grid-cols-[repeat(auto-fill,minmax(240px,1fr))]">
    {Array.from({ length: count }, (_, i) => (
      <AnimalCardSkeleton key={i} />
    ))}
  </div>
);

/** A stack of row skeletons (list layout). */
export const AnimalsRowListSkeleton = ({ count = 8 }: { count?: number }) => (
  <div>
    {Array.from({ length: count }, (_, i) => (
      <AnimalRowSkeleton key={i} />
    ))}
  </div>
);
