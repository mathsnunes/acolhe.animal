'use client';

import { useCallback, useEffect, useRef, useState, type DragEvent, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle, ImagePlus, Loader2, Star, X } from 'lucide-react';

import { getUploadPolicy } from '@acolhe-animal/shared';
import type { AnimalPhoto, AnimalVideo } from '@acolhe-animal/db';

import {
  deleteAnimalPhotoAction,
  deleteAnimalVideoAction,
  listAnimalPhotosAction,
  listAnimalVideosAction,
  setAnimalCoverAction,
} from '@/app/(admin)/animals/actions';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useUploader, type UploadItem } from './use-uploader';

/**
 * Single drop zone for an animal's photos AND videos. Each dropped file is routed
 * by MIME type to the right policy; the domain then decides where it's stored and
 * how it's processed (photos → derivatives inline, videos → poster at commit +
 * transcode in the background worker). Tiles support cover selection (photos) and
 * a click-to-preview lightbox. See `docs/uploads.md`.
 */

const PHOTO_MIMES = new Set(getUploadPolicy('animal-photos').accept);
const VIDEO_MIMES = new Set(getUploadPolicy('animal-videos').accept);
const ACCEPT = [...getUploadPolicy('animal-photos').accept, ...getUploadPolicy('animal-videos').accept].join(',');

const isVideoSettled = (v: AnimalVideo): boolean =>
  v.processingStatus === 'ready' || v.processingStatus === 'failed';

type Preview = { kind: 'image'; src: string } | { kind: 'video'; src: string };

interface Props {
  /** Existing animal id (edit mode) — used to load already-committed media. */
  animalId: string | null;
  /** Ensures a draft exists and returns its id right before uploading. */
  resolveOwnerId: () => Promise<string | null>;
}

export const AnimalMediaUploader = ({ animalId, resolveOwnerId }: Props) => {
  const t = useTranslations('animals');
  const [photos, setPhotos] = useState<AnimalPhoto[]>([]);
  const [videos, setVideos] = useState<AnimalVideo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [ownerId, setOwnerId] = useState<string | null>(animalId);

  const resolveAndTrack = useCallback(async () => {
    const id = await resolveOwnerId();
    if (id) setOwnerId(id);
    return id;
  }, [resolveOwnerId]);

  useEffect(() => {
    if (!animalId) return;
    let active = true;
    void (async () => {
      const [p, v] = await Promise.all([listAnimalPhotosAction(animalId), listAnimalVideosAction(animalId)]);
      if (!active) return;
      if (p.ok) setPhotos(p.data);
      if (v.ok) setVideos(v.data);
    })();
    return () => {
      active = false;
    };
  }, [animalId]);

  useEffect(() => {
    if (!ownerId || videos.every(isVideoSettled)) return;
    const timer = setInterval(async () => {
      const res = await listAnimalVideosAction(ownerId);
      if (res.ok) setVideos(res.data);
    }, 4000);
    return () => clearInterval(timer);
  }, [ownerId, videos]);

  const photoUploader = useUploader({
    policy: 'animal-photos',
    resolveOwnerId: resolveAndTrack,
    onError: setError,
    onCommitted: (m) => setPhotos((prev) => [...prev, m as AnimalPhoto]),
  });
  const videoUploader = useUploader({
    policy: 'animal-videos',
    resolveOwnerId: resolveAndTrack,
    onError: setError,
    onCommitted: (m) => setVideos((prev) => [...prev, m as AnimalVideo]),
  });

  const handleFiles = (files: File[]) => {
    setError(null);
    const imgs: File[] = [];
    const vids: File[] = [];
    let rejected = false;
    for (const f of files) {
      if (PHOTO_MIMES.has(f.type)) imgs.push(f);
      else if (VIDEO_MIMES.has(f.type)) vids.push(f);
      else rejected = true;
    }
    if (rejected) setError(t('wizard.mediaUnsupported'));
    if (imgs.length) void photoUploader.addFiles(imgs);
    if (vids.length) void videoUploader.addFiles(vids);
  };

  const setCover = async (photo: AnimalPhoto) => {
    setPhotos((prev) => prev.map((p) => ({ ...p, isPrimary: p.id === photo.id })));
    await setAnimalCoverAction(photo.id);
  };
  const removePhoto = async (photo: AnimalPhoto) => {
    setPhotos((prev) => {
      const rest = prev.filter((p) => p.id !== photo.id);
      // Deleting the cover promotes the next photo (mirrors the domain), so the
      // "Capa" badge moves immediately instead of disappearing until a refetch.
      const first = rest[0];
      if (photo.isPrimary && first && !rest.some((p) => p.isPrimary)) {
        rest[0] = { ...first, isPrimary: true };
      }
      return rest;
    });
    await deleteAnimalPhotoAction(photo.id);
  };
  const removeVideo = async (video: AnimalVideo) => {
    setVideos((prev) => prev.filter((v) => v.id !== video.id));
    await deleteAnimalVideoAction(video.id);
  };

  const pending = [...photoUploader.items, ...videoUploader.items].filter((it) => it.status !== 'done');
  const hasTiles = photos.length > 0 || videos.length > 0 || pending.length > 0;

  return (
    <div className="mt-4 space-y-4">
      <DropArea accept={ACCEPT} title={t('wizard.mediaDropTitle')} hint={t('wizard.mediaDropHint')} onFiles={handleFiles} />

      {error && (
        <p className="flex items-center gap-1.5 text-sm text-rose" role="alert">
          <AlertCircle className="size-4 shrink-0" /> {error}
        </p>
      )}

      {hasTiles && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {photos.map((photo) => (
            <Tile
              key={photo.id}
              src={photo.thumbUrl}
              onOpen={() => setPreview({ kind: 'image', src: photo.mediumUrl })}
              onRemove={() => void removePhoto(photo)}
              removeLabel={t('wizard.mediaRemove')}
              topLeft={
                photo.isPrimary ? (
                  <Badge>
                    <Star className="size-3" fill="currentColor" /> {t('wizard.mediaCover')}
                  </Badge>
                ) : (
                  <CornerButton
                    label={t('wizard.mediaSetCover')}
                    onClick={() => void setCover(photo)}
                  >
                    <Star className="size-3.5" />
                  </CornerButton>
                )
              }
            />
          ))}
          {videos.map((video) => (
            <Tile
              key={video.id}
              src={video.posterUrl ?? undefined}
              isVideo
              onOpen={() => setPreview({ kind: 'video', src: video.processedUrl ?? video.originalUrl })}
              onRemove={() => void removeVideo(video)}
              removeLabel={t('wizard.mediaRemove')}
              topLeft={
                isVideoSettled(video) ? undefined : (
                  <Badge variant={video.processingStatus === 'failed' ? 'error' : 'default'}>
                    {video.processingStatus === 'failed' ? (
                      <>
                        <AlertCircle className="size-3" /> {t('wizard.mediaFailed')}
                      </>
                    ) : (
                      <>
                        <Loader2 className="size-3 animate-spin" /> {t('wizard.mediaProcessing')}
                      </>
                    )}
                  </Badge>
                )
              }
            />
          ))}
          {pending.map((it) => (
            <PendingTile
              key={it.localId}
              item={it}
              t={t}
              onDismiss={() =>
                (it.media && 'processingStatus' in it.media ? videoUploader : photoUploader).dismiss(it.localId)
              }
            />
          ))}
        </div>
      )}

      <Dialog open={!!preview} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="max-w-3xl overflow-hidden p-2">
          <DialogTitle className="sr-only">{t('wizard.mediaPreviewTitle')}</DialogTitle>
          {preview?.kind === 'image' ? (
            // eslint-disable-next-line @next/next/no-img-element -- user media preview
            <img src={preview.src} alt="" className="max-h-[80vh] w-full rounded-md object-contain" />
          ) : preview?.kind === 'video' ? (
            <video src={preview.src} controls autoPlay className="max-h-[80vh] w-full rounded-md" />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* ── pieces ──────────────────────────────────────────────────────────────── */

const DropArea = ({
  accept,
  title,
  hint,
  onFiles,
}: {
  accept: string;
  title: string;
  hint: string;
  onFiles: (files: File[]) => void;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    onFiles(Array.from(e.dataTransfer.files));
  };

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      className={cn(
        'flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-10 text-center transition-colors',
        over ? 'border-terra bg-terra/5' : 'border-line bg-bg-2/40 hover:border-terra/60',
      )}
    >
      <ImagePlus className="size-9 text-ink-mute/60" strokeWidth={1.3} />
      <p className="text-sm font-medium text-ink">{title}</p>
      <p className="text-xs text-ink-mute">{hint}</p>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept}
        className="hidden"
        onChange={(e) => {
          onFiles(Array.from(e.target.files ?? []));
          e.target.value = '';
        }}
      />
    </div>
  );
};

const Tile = ({
  src,
  isVideo,
  topLeft,
  onOpen,
  onRemove,
  removeLabel,
}: {
  src?: string;
  isVideo?: boolean;
  topLeft?: ReactNode;
  onOpen?: () => void;
  onRemove: () => void;
  removeLabel: string;
}) => (
  <div className="group relative aspect-square overflow-hidden rounded-lg border border-line bg-bg-2">
    <button type="button" onClick={onOpen} className="block size-full" aria-label="">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- user media on R2/local, not a known-size next/image asset
        <img src={src} alt="" className="size-full object-cover" />
      ) : (
        <div className="flex size-full items-center justify-center">
          <Loader2 className="size-6 animate-spin text-ink-mute/60" />
        </div>
      )}
    </button>
    {isVideo && (
      <span className="pointer-events-none absolute bottom-1.5 left-1.5 rounded bg-ink/75 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-paper">
        vídeo
      </span>
    )}
    {topLeft && <div className="absolute left-1.5 top-1.5">{topLeft}</div>}
    <button
      type="button"
      onClick={onRemove}
      aria-label={removeLabel}
      className="absolute right-1.5 top-1.5 inline-flex size-6 items-center justify-center rounded-full bg-ink/75 text-paper opacity-0 transition group-hover:opacity-100"
    >
      <X className="size-3.5" />
    </button>
  </div>
);

const Badge = ({ children, variant = 'default' }: { children: ReactNode; variant?: 'default' | 'error' }) => (
  <span
    className={cn(
      'pointer-events-none inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium text-paper',
      variant === 'error' ? 'bg-rose' : 'bg-ink/75',
    )}
  >
    {children}
  </span>
);

const CornerButton = ({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    title={label}
    aria-label={label}
    className="inline-flex size-6 items-center justify-center rounded-full bg-ink/55 text-paper opacity-0 transition hover:bg-ink/80 group-hover:opacity-100"
  >
    {children}
  </button>
);

const PendingTile = ({
  item,
  t,
  onDismiss,
}: {
  item: UploadItem;
  t: ReturnType<typeof useTranslations>;
  onDismiss: () => void;
}) => (
  <div className="relative flex aspect-square flex-col items-center justify-center gap-2 rounded-lg border border-line bg-bg-2 p-3 text-center">
    {item.status === 'error' ? (
      <>
        <AlertCircle className="size-6 text-rose" />
        <p className="line-clamp-2 text-[11px] text-rose">{item.error ?? t('wizard.mediaFailed')}</p>
        <button type="button" onClick={onDismiss} className="text-[11px] font-medium text-ink-mute hover:text-ink">
          {t('wizard.mediaRemove')}
        </button>
      </>
    ) : (
      <>
        <Loader2 className="size-6 animate-spin text-terra" />
        <p className="w-full truncate text-[11px] text-ink-mute">
          {item.status === 'processing' ? t('wizard.mediaProcessing') : `${item.progress}%`}
        </p>
        {item.status === 'uploading' && <Progress value={item.progress} className="h-1.5 w-full" />}
      </>
    )}
  </div>
);
