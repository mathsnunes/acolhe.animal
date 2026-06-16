'use client';

import { useMemo, useState, useTransition } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Copy, Download, ImageIcon, RefreshCw, Sparkles } from 'lucide-react';

import type { InstagramArtType } from '@acolhe-animal/shared';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { generateInstagramArtAction } from '@/app/(admin)/animals/actions';

export interface ArtPhoto {
  id: string;
  thumbUrl: string;
  isPrimary: boolean;
}
export interface ArtState {
  imageUrl: string;
  caption: string;
  generatedAt: string; // ISO
}
interface Props {
  animalId: string;
  animalName: string;
  photos: ArtPhoto[];
  /** Already-generated arts (at most one per type), to seed the modal. */
  initialArt: Array<{ type: InstagramArtType; imageUrl: string; caption: string | null; generatedAt: string }>;
}

const TYPES: InstagramArtType[] = ['feed-square', 'story-vertical'];
const shortDate = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(iso));

export const InstagramArtDialog = ({ animalId, animalName, photos, initialArt }: Props) => {
  const t = useTranslations('instagram');
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<InstagramArtType>('feed-square');
  const [photoId, setPhotoId] = useState(() => photos.find((p) => p.isPrimary)?.id ?? photos[0]?.id ?? '');
  const [pending, startTransition] = useTransition();

  const seed = useMemo(() => {
    const map = {} as Record<InstagramArtType, ArtState | null>;
    for (const ty of TYPES) {
      const a = initialArt.find((x) => x.type === ty);
      map[ty] = a ? { imageUrl: a.imageUrl, caption: a.caption ?? '', generatedAt: a.generatedAt } : null;
    }
    return map;
  }, [initialArt]);

  const [arts, setArts] = useState<Record<InstagramArtType, ArtState | null>>(seed);
  const [captions, setCaptions] = useState<Record<InstagramArtType, string>>({
    'feed-square': seed['feed-square']?.caption ?? '',
    'story-vertical': seed['story-vertical']?.caption ?? '',
  });

  const current = arts[tab];
  const noPhotos = photos.length === 0;

  const generate = () => {
    if (!photoId) return;
    startTransition(async () => {
      const res = await generateInstagramArtAction({ animalId, type: tab, photoId });
      if (!res.ok) {
        toast.error(res.error.message || t('generateError'));
        return;
      }
      const a: ArtState = {
        imageUrl: res.data.imageUrl,
        caption: res.data.caption ?? '',
        generatedAt: new Date(res.data.generatedAt).toISOString(),
      };
      setArts((prev) => ({ ...prev, [tab]: a }));
      setCaptions((prev) => ({ ...prev, [tab]: a.caption }));
    });
  };

  const copyImage = async () => {
    if (!current) return;
    try {
      const blob = await (await fetch(current.imageUrl)).blob();
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      toast.success(t('imageCopied'));
    } catch {
      toast.error(t('copyImageUnsupported'));
    }
  };

  const copyCaption = async () => {
    await navigator.clipboard.writeText(captions[tab]);
    toast.success(t('captionCopied'));
  };

  const download = () => {
    if (!current) return;
    const link = document.createElement('a');
    link.href = current.imageUrl;
    link.download = `${animalName}-${tab}.png`;
    link.click();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <ImageIcon /> {t('trigger')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl gap-5">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('subtitle', { name: animalName })}</DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as InstagramArtType)}>
          <TabsList>
            {TYPES.map((ty) => (
              <TabsTrigger key={ty} value={ty}>
                {t(`tabs.${ty === 'feed-square' ? 'feed' : 'story'}`)}
                <span className="ml-1.5 text-[11px] font-normal text-ink-mute">{t(`dimensions.${ty}`)}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {TYPES.map((ty) => (
            <TabsContent key={ty} value={ty} className="mt-5">
              <div className="grid gap-6 sm:grid-cols-[minmax(0,300px)_1fr]">
                {/* ── Preview + photo picker ── */}
                <div className="space-y-3">
                  <div
                    className={cn(
                      'relative overflow-hidden rounded-xl border border-line bg-bg-2',
                      ty === 'feed-square' ? 'aspect-square' : 'mx-auto aspect-[9/16] max-w-[220px]',
                    )}
                  >
                    {pending ? (
                      <Spinner label={t('generating')} />
                    ) : current ? (
                      <Image src={current.imageUrl} alt={animalName} fill className="object-cover" unoptimized />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-ink-mute">
                        <Sparkles className="size-6" aria-hidden />
                        <p className="text-sm font-medium text-ink">{t('emptyTitle')}</p>
                        <p className="text-xs">{t('emptyHint')}</p>
                      </div>
                    )}
                  </div>

                  {!noPhotos && (
                    <div className="flex flex-wrap gap-2">
                      {photos.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setPhotoId(p.id)}
                          aria-pressed={p.id === photoId}
                          className={cn(
                            'size-12 overflow-hidden rounded-md border-2 transition-colors',
                            p.id === photoId ? 'border-terra' : 'border-transparent hover:border-line',
                          )}
                        >
                          <Image src={p.thumbUrl} alt="" width={48} height={48} className="size-full object-cover" unoptimized />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* ── Caption + actions ── */}
                <div className="flex flex-col gap-3">
                  <div>
                    <p className="eyebrow mb-2">— {t('captionLabel')}</p>
                    <Textarea
                      rows={7}
                      value={captions[ty]}
                      onChange={(e) => setCaptions((prev) => ({ ...prev, [ty]: e.target.value }))}
                      disabled={!current}
                      className="resize-none text-[13px] leading-relaxed"
                    />
                    <p className="hint mt-1 text-right">{t('chars', { count: captions[ty].length })}</p>
                  </div>

                  {current && (
                    <p className="hint -mt-1">{t('generatedAt', { date: shortDate(current.generatedAt) })}</p>
                  )}

                  {noPhotos ? (
                    <p className="rounded-lg bg-bg-2 px-3 py-2.5 text-sm text-ink-mute">{t('noPhotos')}</p>
                  ) : (
                    <div className="space-y-2">
                      <Button onClick={generate} pending={pending} className="w-full">
                        {current ? <RefreshCw /> : <Sparkles />} {current ? t('regenerate') : t('generate')}
                      </Button>
                      {current && (
                        <>
                          <Button variant="outline" onClick={copyImage} disabled={pending} className="w-full">
                            <Copy /> {t('copyImage')}
                          </Button>
                          <div className="grid grid-cols-2 gap-2">
                            <Button variant="ghost" size="sm" onClick={copyCaption} disabled={pending}>
                              <Copy /> {t('copyCaption')}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={download} disabled={pending}>
                              <Download /> {t('download')}
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>

        <p className="border-t border-line-soft pt-4 text-center text-[12px] leading-relaxed text-ink-mute">
          {t('footer')}
        </p>
      </DialogContent>
    </Dialog>
  );
};

const Spinner = ({ label }: { label: string }) => (
  <div className="flex h-full flex-col items-center justify-center gap-3 text-ink-mute">
    <span className="flex gap-1.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-2.5 animate-pulse-dot rounded-full bg-terra"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
    <p className="text-sm font-medium text-ink">{label}</p>
  </div>
);
