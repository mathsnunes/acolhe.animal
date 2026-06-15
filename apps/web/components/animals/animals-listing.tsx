'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import { loadAnimalsPageAction } from '@/app/(admin)/animals/actions';
import type { AnimalListItem, AnimalsFilterInput, AnimalsPage } from '@/lib/animals-query';
import { AnimalCard } from './animal-card';
import { AnimalRow, AnimalsListHeader } from './animal-row';
import { AnimalCardSkeleton, AnimalRowSkeleton } from './animals-skeletons';

/**
 * Infinite-scroll container for the admin animals listing. The server renders
 * the first page; this client component appends the next pages as a sentinel
 * scrolls into view (with a clickable "load more" fallback for keyboard/no-IO).
 *
 * It's intentionally stateless across filter changes: the page keys it by the
 * active filters + view, so changing a filter remounts it with a fresh first
 * page from the server — no client-side cache to invalidate.
 */
export const AnimalsListing = ({
  initial,
  view,
  filters,
  pageSize,
}: {
  initial: AnimalsPage;
  view: 'list' | 'cards';
  filters: AnimalsFilterInput;
  pageSize: number;
}) => {
  const t = useTranslations('animals');
  const [items, setItems] = useState<AnimalListItem[]>(initial.items);
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
      const page = await loadAnimalsPageAction({ filters, offset: offsetRef.current, limit: pageSize });
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
    // Prefetch ~one viewport early so the next page is usually ready before the
    // user hits the bottom. Re-subscribing on every appended batch (`items.length`)
    // is what keeps the auto-load chaining: an IntersectionObserver only fires on
    // an enter transition, so if the sentinel stays in view after a load, a fresh
    // observer is needed to re-check and pull the next page — until it scrolls out
    // of range or `hasMore` flips false.
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: '600px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore, hasMore, items.length]);

  const isList = view === 'list';
  const SkeletonItem = isList ? AnimalRowSkeleton : AnimalCardSkeleton;

  return (
    <div className="mt-7 px-6 sm:px-10">
      {isList ? (
        <div>
          <AnimalsListHeader />
          {items.map((it) => (
            <AnimalRow key={it.animal.id} animal={it.animal} waiting={it.waiting} coverUrl={it.coverUrl} />
          ))}
          {loading && Array.from({ length: 4 }, (_, i) => <AnimalRowSkeleton key={`s${i}`} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-[18px] lg:grid-cols-[repeat(auto-fill,minmax(240px,1fr))]">
          {items.map((it) => (
            <AnimalCard key={it.animal.id} animal={it.animal} waiting={it.waiting} coverUrl={it.coverUrl} />
          ))}
          {loading && Array.from({ length: 4 }, (_, i) => <SkeletonItem key={`s${i}`} />)}
        </div>
      )}

      {hasMore && (
        <div ref={sentinelRef} className="mt-8 flex justify-center">
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
