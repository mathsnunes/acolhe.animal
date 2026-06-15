'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import { loadCandidatesPageAction } from '@/app/(admin)/candidates/actions';
import type { CandidateListItem, CandidatesFilterInput, CandidatesPage } from '@/lib/candidates-query';
import { Kanban } from './kanban';
import { CandidateCard } from './candidate-card';
import { CandidateRow, CandidatesListHeader } from './candidate-row';
import { CandidateCardSkeleton, CandidateRowSkeleton } from './candidates-skeletons';

/**
 * Responsive container for the candidates listing. The server renders the first
 * (flat) page plus, in kanban mode, the full set; this client component appends
 * the next flat pages as a sentinel scrolls into view.
 *
 * - Desktop, kanban view → the full-set board (no paging).
 * - Desktop, table view → the dense table with infinite scroll.
 * - Mobile (any view) → full-width cards with infinite scroll.
 *
 * It's stateless across filter changes: the page keys it by the active filters +
 * view, so changing anything remounts it with a fresh first page from the server.
 */
export const CandidatesListing = ({
  initial,
  kanbanItems,
  filters,
  pageSize,
}: {
  initial: CandidatesPage;
  /** Full set for the desktop kanban; null when the table view is active. */
  kanbanItems: CandidateListItem[] | null;
  filters: CandidatesFilterInput;
  pageSize: number;
}) => {
  const t = useTranslations('candidates');
  const [items, setItems] = useState<CandidateListItem[]>(initial.items);
  const [hasMore, setHasMore] = useState(initial.hasMore);
  const [loading, setLoading] = useState(false);
  const offsetRef = useRef(initial.nextOffset);
  const loadingRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const page = await loadCandidatesPageAction({
        filters,
        offset: offsetRef.current,
        limit: pageSize,
      });
      offsetRef.current = page.nextOffset;
      setItems((prev) => [...prev, ...page.items]);
      setHasMore(page.hasMore);
    } catch {
      // Stop trying on error; the rendered items stay put.
      setHasMore(false);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [filters, hasMore, pageSize]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    // Prefetch ~one viewport early; re-subscribe on every appended batch so the
    // auto-load keeps chaining while the sentinel stays in view.
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: '600px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore, hasMore, items.length]);

  const isKanban = kanbanItems !== null;

  return (
    <div className="mt-7 px-6 sm:px-10">
      {/* Desktop: kanban board or dense table */}
      <div className="hidden lg:block">
        {isKanban ? (
          <Kanban items={kanbanItems} />
        ) : (
          <div>
            <CandidatesListHeader />
            {items.map((it) => (
              <CandidateRow key={it.application.id} item={it} />
            ))}
            {loading && Array.from({ length: 4 }, (_, i) => <CandidateRowSkeleton key={`sr${i}`} />)}
          </div>
        )}
      </div>

      {/* Mobile: full-width cards */}
      <div className="flex flex-col gap-2.5 lg:hidden">
        {items.map((it) => (
          <CandidateCard key={it.application.id} item={it} />
        ))}
        {loading && Array.from({ length: 4 }, (_, i) => <CandidateCardSkeleton key={`sc${i}`} />)}
      </div>

      {hasMore && (
        <div
          ref={sentinelRef}
          className={cn('mt-8 flex justify-center', isKanban && 'lg:hidden')}
        >
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className={cn(
              'inline-flex items-center gap-2 rounded-full border border-line bg-paper px-5 py-2.5 text-[13px] text-ink-soft transition-colors',
              'hover:bg-bg-2 hover:text-ink disabled:opacity-60',
            )}
          >
            {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {loading ? t('list.loadingMore') : t('list.loadMore')}
          </button>
        </div>
      )}
    </div>
  );
};
