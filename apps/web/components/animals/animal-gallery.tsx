'use client';

import { type TouchEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight, PawPrint, Play, Video } from 'lucide-react';

import type { AnimalPhoto, AnimalVideo } from '@acolhe-animal/db';

import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

/** A photo or video flattened into the shape the gallery renders. */
type GalleryItem =
  | { kind: 'photo'; id: string; thumb: string; medium: string; full: string; alt: string }
  | {
      kind: 'video';
      id: string;
      thumb: string | null;
      src: string | null;
      poster: string | null;
      duration: number | null;
      processing: boolean;
      playable: boolean;
      caption: string | null;
    };

/** Seconds → "m:ss". */
const formatDuration = (seconds: number | null): string | null => {
  if (seconds == null) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};

/**
 * Detail-hero gallery: a 4:3 main stage plus a row of square thumbnails for the
 * animal's photos and videos. Clicking opens a full-screen lightbox (image or
 * video player) with prev/next navigation. Mirrors the prototype's
 * `.detail-gallery` (read-only view; uploads live in the wizard's media step).
 */
export const AnimalGallery = ({
  photos,
  videos,
  name,
}: {
  photos: AnimalPhoto[];
  videos: AnimalVideo[];
  name: string;
}) => {
  const t = useTranslations('animals');

  // Cover (primary) photo leads the gallery, then the rest by display order.
  const orderedPhotos = [...photos].sort((a, b) => {
    if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
    return a.displayOrder - b.displayOrder;
  });

  const items: GalleryItem[] = [
    ...orderedPhotos.map(
      (p): GalleryItem => ({
        kind: 'photo',
        id: p.id,
        thumb: p.thumbUrl,
        medium: p.mediumUrl,
        full: p.originalUrl,
        alt: p.altText ?? name,
      }),
    ),
    // Failed transcodes are hidden entirely; pending/processing still show with a badge.
    ...videos
      .filter((v) => v.processingStatus !== 'failed')
      .map((v): GalleryItem => {
        const processing =
          v.processingStatus === 'pending' || v.processingStatus === 'processing';
        return {
        kind: 'video',
        id: v.id,
        thumb: v.posterUrl,
        src: v.processedUrl ?? v.originalUrl,
        poster: v.posterUrl,
        duration: v.durationSeconds,
        processing,
        playable: v.processingStatus === 'ready' && Boolean(v.processedUrl ?? v.originalUrl),
        caption: v.caption,
      };
    }),
  ];

  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);

  const go = useCallback(
    (delta: number) => setActive((i) => (i + delta + items.length) % items.length),
    [items.length],
  );

  // Arrow-key navigation while the lightbox is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, go]);

  if (items.length === 0) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center self-start overflow-hidden rounded-2xl border border-line bg-bg-2">
        <PawPrint className="size-20 text-ink-mute/50" aria-hidden />
      </div>
    );
  }

  const current = items[active];
  if (!current) return null;

  const openable = current.kind === 'photo' || current.playable;

  // Horizontal swipe to move between media on touch devices. A swipe also
  // suppresses the next click so the main stage doesn't open the lightbox.
  const onTouchStart = (e: TouchEvent<HTMLElement>) => {
    const touch = e.touches[0];
    touchStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
    swiped.current = false;
  };
  const onTouchEnd = (e: TouchEvent<HTMLElement>) => {
    const start = touchStart.current;
    const touch = e.changedTouches[0];
    touchStart.current = null;
    if (!start || !touch) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      swiped.current = true;
      go(dx < 0 ? 1 : -1);
    }
  };

  return (
    <div className="flex flex-col gap-2.5 self-start">
      {/* Main stage */}
      <button
        type="button"
        onClick={() => {
          if (swiped.current) {
            swiped.current = false;
            return;
          }
          if (openable) setOpen(true);
        }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        aria-label={t('detail.galleryOpen')}
        className={cn(
          'group relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl border border-line bg-bg-2',
          openable ? 'cursor-zoom-in' : 'cursor-default',
        )}
      >
        {current.kind === 'photo' ? (
          // eslint-disable-next-line @next/next/no-img-element -- user media on R2/local
          <img src={current.medium} alt={current.alt} className="size-full object-cover" />
        ) : current.poster ? (
          // eslint-disable-next-line @next/next/no-img-element -- user media on R2/local
          <img src={current.poster} alt={current.caption ?? name} className="size-full object-cover" />
        ) : (
          <Video className="size-16 text-ink-mute/50" aria-hidden />
        )}

        {/* Video play affordance / processing state on the main stage */}
        {current.kind === 'video' && !current.processing && current.playable && (
          <span className="absolute left-1/2 top-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-paper/95 text-ink shadow-elevated transition group-hover:scale-105">
            <Play className="size-6 translate-x-0.5 fill-current" aria-hidden />
          </span>
        )}
        {current.kind === 'video' && current.processing && (
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink/70 px-3 py-1.5 text-[11px] font-medium text-paper backdrop-blur">
            {t('detail.galleryProcessing')}
          </span>
        )}

        {items.length > 1 && (
          <span className="absolute bottom-3 left-3 inline-flex items-center rounded-full bg-ink/70 px-2.5 py-1 text-[11px] font-medium tabular-nums text-paper backdrop-blur">
            {t('detail.galleryCounter', { current: active + 1, total: items.length })}
          </span>
        )}
      </button>

      {/* Thumbnails */}
      {items.length > 1 && (
        <div className="grid grid-cols-5 gap-2">
          {items.map((item, i) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActive(i)}
              aria-label={t('detail.galleryThumb', { index: i + 1 })}
              aria-current={i === active}
              className={cn(
                'relative aspect-square overflow-hidden rounded-lg border-[1.5px] transition',
                i === active ? 'border-terra' : 'border-transparent hover:-translate-y-px',
              )}
            >
              {item.thumb ? (
                // eslint-disable-next-line @next/next/no-img-element -- user media on R2/local
                <img src={item.thumb} alt="" className="size-full object-cover" />
              ) : (
                <span className="flex size-full items-center justify-center bg-bg-2">
                  <Video className="size-4 text-ink-mute" aria-hidden />
                </span>
              )}

              {item.kind === 'video' && (
                <>
                  <span className="absolute left-1 top-1 inline-flex items-center gap-0.5 rounded-full bg-ink px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-paper">
                    <Video className="size-2.5" aria-hidden />
                    {t('detail.galleryVideo')}
                  </span>
                  {!item.processing && (
                    <span className="absolute left-1/2 top-1/2 flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-ink/70 text-paper backdrop-blur">
                      <Play className="size-3 translate-x-px fill-current" aria-hidden />
                    </span>
                  )}
                  {formatDuration(item.duration) && (
                    <span className="absolute bottom-1 right-1 rounded bg-ink/80 px-1 py-0.5 text-[9px] font-medium tabular-nums text-paper">
                      {formatDuration(item.duration)}
                    </span>
                  )}
                </>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[min(94vw,1120px)] border-0 bg-transparent p-0 shadow-none">
          <DialogTitle className="sr-only">{t('detail.galleryViewTitle', { name })}</DialogTitle>

          <div
            className="relative flex items-center justify-center"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            {current.kind === 'photo' ? (
              // eslint-disable-next-line @next/next/no-img-element -- user media on R2/local
              <img
                src={current.full}
                alt={current.alt}
                className="max-h-[82vh] w-auto max-w-full rounded-xl object-contain"
              />
            ) : current.src ? (
              <video
                key={current.id}
                src={current.src}
                poster={current.poster ?? undefined}
                controls
                autoPlay
                playsInline
                preload="metadata"
                className="max-h-[82vh] w-auto max-w-full rounded-xl bg-ink"
              />
            ) : null}

            {items.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => go(-1)}
                  aria-label={t('detail.galleryPrev')}
                  className="absolute left-2 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-ink/60 text-paper backdrop-blur transition hover:bg-ink/80"
                >
                  <ChevronLeft className="size-5" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  aria-label={t('detail.galleryNext')}
                  className="absolute right-2 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-ink/60 text-paper backdrop-blur transition hover:bg-ink/80"
                >
                  <ChevronRight className="size-5" aria-hidden />
                </button>
                <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-ink/70 px-3 py-1 text-[11px] font-medium tabular-nums text-paper backdrop-blur">
                  {t('detail.galleryCounter', { current: active + 1, total: items.length })}
                </span>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
