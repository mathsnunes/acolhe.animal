import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { CANDIDATE_ROW_COLS } from './candidate-row';

/**
 * Loading placeholders for the candidates listing — the "loading more" batch the
 * infinite-scroll container appends while fetching the next page. Mirrors the
 * card/row shapes so the layout doesn't jump when real data lands.
 */

export const CandidateCardSkeleton = () => (
  <div className="flex flex-col gap-2.5 rounded-xl border border-line-soft bg-paper p-3.5">
    <div className="flex flex-col gap-1.5">
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-3 w-2/5" />
    </div>
    <div className="flex items-center gap-2">
      <Skeleton className="size-6 rounded-full" />
      <Skeleton className="h-4 w-1/3" />
    </div>
    <Skeleton className="mt-1 h-4 w-full" />
  </div>
);

export const CandidateRowSkeleton = () => (
  <div
    className={cn(
      'grid items-center gap-4 border-b border-line-soft px-4 py-3.5',
      CANDIDATE_ROW_COLS,
    )}
  >
    <div className="flex items-center gap-2.5">
      <Skeleton className="size-[26px] rounded-full" />
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
    <div className="flex items-center gap-2">
      <Skeleton className="size-7 rounded-full" />
      <Skeleton className="h-3.5 w-20" />
    </div>
    <Skeleton className="h-3 w-24" />
    <Skeleton className="h-3 w-14" />
    <Skeleton className="h-5 w-24 rounded-full" />
    <Skeleton className="h-3 w-20" />
  </div>
);
