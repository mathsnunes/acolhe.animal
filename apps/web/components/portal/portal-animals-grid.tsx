'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import { loadPortalAnimalsPageAction } from '@/app/[slug]/actions';
import type { PortalAnimalItem, PortalAnimalsPage } from '@/lib/portal-query';
import { PortalAnimalCard } from './portal-animal-card';
import { PortalAnimalCardSkeleton } from './portal-animal-card-skeleton';

/**
 * Public portal animals grid with infinite scroll. The server renders the first
 * page; this appends the rest as the sentinel scrolls into view, with a clickable
 * fallback. Cards only — the portal has no list/grid toggle.
 */
export const PortalAnimalsGrid = ({ slug, initial }: { slug: string; initial: PortalAnimalsPage }) => {
  const t = useTranslations('portal');
  const [items, setItems] = useState<PortalAnimalItem[]>(initial.items);
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
      const page = await loadPortalAnimalsPageAction({ slug, offset: offsetRef.current });
      offsetRef.current = page.nextOffset;
      setItems((prev) => [...prev, ...page.items]);
      setHasMore(page.hasMore);
    } catch {
      setHasMore(false);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [slug, hasMore]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    // Re-subscribe on each appended batch (`items.length`): an IntersectionObserver
    // only fires on an enter transition, so if the sentinel stays in view after a
    // load, a fresh observer is needed to keep chaining the next page until it
    // scrolls out of range or `hasMore` flips false.
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: '600px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore, hasMore, items.length]);

  return (
    <>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((it) => (
          <PortalAnimalCard
            key={it.animal.id}
            slug={slug}
            animal={it.animal}
            photoUrl={it.photoUrl}
            listedForAdoption={it.animal.listedForAdoption}
          />
        ))}
        {loading && Array.from({ length: 3 }, (_, i) => <PortalAnimalCardSkeleton key={`s${i}`} />)}
      </div>

      {hasMore && (
        <div ref={sentinelRef} className="mt-10 flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className={cn(
              'inline-flex items-center gap-2 rounded-full border border-line bg-paper px-6 py-3 text-sm text-ink-soft transition-colors',
              'hover:bg-bg-2 hover:text-ink disabled:opacity-60',
            )}
          >
            {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {loading ? t('available.loadingMore') : t('available.loadMore')}
          </button>
        </div>
      )}
    </>
  );
};
