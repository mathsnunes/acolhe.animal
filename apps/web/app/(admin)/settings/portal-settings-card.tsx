'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

import { Check, Plus } from 'lucide-react';

import { slugify } from '@acolhe-animal/shared';

import { Field } from '@/components/auth/field';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { checkSettingsSlugAction, updatePortalAction } from './actions';

type SlugStatus = 'idle' | 'checking' | 'available' | 'taken' | 'reserved' | 'invalid';

/** Curated portal accent colors (the brand terra is the implicit default). */
const ACCENT_PALETTE = ['#2d4a39', '#2f7d8a', '#4a5bb0', '#9b3b54', '#b8862f', '#4b5563'];

/** Portal on/off + public URL, with live slug availability. Admin only. */
export const PortalSettingsCard = ({
  initialEnabled,
  initialSlug,
  initialPrimaryColor,
  initialInstagram,
}: {
  initialEnabled: boolean;
  initialSlug: string;
  /** Saved accent color (hex), or null/empty for the brand default. */
  initialPrimaryColor?: string | null;
  /** Saved Instagram handle (without @), or null/empty. */
  initialInstagram?: string | null;
}) => {
  const router = useRouter();
  const t = useTranslations('settings');
  const [pending, startTransition] = useTransition();

  const [enabled, setEnabled] = useState(initialEnabled);
  const [slug, setSlug] = useState(initialSlug);
  const [slugStatus, setSlugStatus] = useState<SlugStatus>('idle');
  // '' = brand default (terra). A hex = custom accent.
  const [color, setColor] = useState((initialPrimaryColor ?? '').toLowerCase());
  const [instagram, setInstagram] = useState(initialInstagram ?? '');

  // Live availability — skip when it's the org's current slug (always fine).
  useEffect(() => {
    if (slug === initialSlug) {
      setSlugStatus('idle');
      return;
    }
    if (slug.length < 3) {
      setSlugStatus(slug.length === 0 ? 'idle' : 'invalid');
      return;
    }
    setSlugStatus('checking');
    const timer = setTimeout(async () => {
      const result = await checkSettingsSlugAction(slug);
      setSlugStatus(result.available ? 'available' : result.reason);
    }, 350);
    return () => clearTimeout(timer);
  }, [slug, initialSlug]);

  const slugChanged = slug !== initialSlug;
  const slugBlocks = slugChanged && slug.length > 0 && slugStatus !== 'available';

  const colorChanged = (color || null) !== ((initialPrimaryColor ?? '').toLowerCase() || null);
  const isCustomColor = color !== '' && !ACCENT_PALETTE.includes(color);
  const igChanged = instagram.trim() !== (initialInstagram ?? '');

  const onSave = () => {
    startTransition(async () => {
      const res = await updatePortalAction({
        enabled,
        slug: slugChanged && slug ? slug : undefined,
        primaryColor: colorChanged ? color || null : undefined,
        instagram: igChanged ? instagram.trim() : undefined,
      });
      if (res.ok) {
        toast.success(t('portal.saved'));
        router.refresh();
      } else {
        toast.error(res.error.message);
      }
    });
  };

  const slugHint =
    slugStatus === 'checking'
      ? t('portal.slugChecking')
      : slugStatus === 'available'
        ? t('portal.slugAvailable')
        : slugStatus === 'taken'
          ? t('portal.slugTaken')
          : slugStatus === 'reserved'
            ? t('portal.slugReserved')
            : slugStatus === 'invalid'
              ? t('portal.slugInvalid')
              : undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('portal.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-ink">{t('portal.enabledLabel')}</p>
            <p className="mt-0.5 hint">{t('portal.enabledHint')}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={() => setEnabled((v) => !v)}
            className={cn('relative h-6 w-11 shrink-0 rounded-full transition', enabled ? 'bg-terra' : 'bg-line')}
          >
            <span
              className={cn(
                'absolute top-0.5 size-5 rounded-full bg-paper shadow-sm transition',
                enabled ? 'left-[22px]' : 'left-0.5',
              )}
            />
          </button>
        </div>

        <Field label={t('portal.slugLabel')} hint={slugHint}>
          <div className="flex items-center overflow-hidden rounded-lg border border-line bg-bg-2 font-mono text-[12px] focus-within:border-terra focus-within:bg-paper">
            <span className="select-none py-2 pl-3 text-ink-mute">acolhe.animal/</span>
            <input
              value={slug}
              onChange={(e) => setSlug(slugify(e.target.value))}
              placeholder={t('portal.slugPlaceholder')}
              autoComplete="off"
              spellCheck={false}
              className="min-w-0 flex-1 bg-transparent py-2 pr-3 font-medium text-terra outline-none placeholder:font-normal placeholder:text-ink-mute"
            />
          </div>
        </Field>

        {enabled && slug && !slugBlocks && (
          <p className="text-[13px] text-ink-soft">
            {t('portal.liveAt')}{' '}
            <a
              href={`/${slug}`}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-terra hover:underline"
            >
              acolhe.animal/{slug}
            </a>
          </p>
        )}

        <div className="space-y-2">
          <p className="text-sm font-medium text-ink">{t('portal.colorLabel')}</p>
          <p className="hint">{t('portal.colorHint')}</p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {/* Brand default (terra) */}
            <button
              type="button"
              onClick={() => setColor('')}
              aria-label={t('portal.colorDefault')}
              aria-pressed={color === ''}
              style={{ background: '#b85c3c' }}
              className={cn(
                'flex size-8 items-center justify-center rounded-full ring-offset-2 ring-offset-paper transition',
                color === '' ? 'ring-2 ring-ink' : 'ring-1 ring-line hover:ring-ink/30',
              )}
            >
              {color === '' && <Check className="size-4 text-paper" />}
            </button>

            {ACCENT_PALETTE.map((hex) => (
              <button
                key={hex}
                type="button"
                onClick={() => setColor(hex)}
                aria-label={hex}
                aria-pressed={color === hex}
                style={{ background: hex }}
                className={cn(
                  'flex size-8 items-center justify-center rounded-full ring-offset-2 ring-offset-paper transition',
                  color === hex ? 'ring-2 ring-ink' : 'ring-1 ring-line hover:ring-ink/30',
                )}
              >
                {color === hex && <Check className="size-4 text-paper" />}
              </button>
            ))}

            {/* Custom hex via the native color input */}
            <label
              title={t('portal.colorCustom')}
              style={isCustomColor ? { background: color } : undefined}
              className={cn(
                'relative flex size-8 cursor-pointer items-center justify-center rounded-full ring-offset-2 ring-offset-paper transition',
                isCustomColor ? 'ring-2 ring-ink' : 'bg-bg-2 ring-1 ring-line hover:ring-ink/30',
              )}
            >
              {isCustomColor ? (
                <Check className="size-4 text-paper" />
              ) : (
                <Plus className="size-4 text-ink-mute" />
              )}
              <input
                type="color"
                value={color || '#b85c3c'}
                onChange={(e) => setColor(e.target.value.toLowerCase())}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
            </label>
          </div>
        </div>

        <Field label={t('portal.instagramLabel')} hint={t('portal.instagramHint')}>
          <div className="flex items-center overflow-hidden rounded-lg border border-line bg-bg-2 focus-within:border-terra focus-within:bg-paper">
            <span className="select-none py-2 pl-3 text-ink-mute">@</span>
            <input
              value={instagram}
              onChange={(e) => setInstagram(e.target.value.replace(/^@+/, '').trim())}
              placeholder={t('portal.instagramPlaceholder')}
              autoComplete="off"
              spellCheck={false}
              className="min-w-0 flex-1 bg-transparent py-2 pl-1 pr-3 text-sm text-ink outline-none placeholder:text-ink-mute"
            />
          </div>
        </Field>

        <div className="flex justify-end">
          <Button type="button" onClick={onSave} pending={pending} disabled={slugBlocks || (enabled && !slug)}>
            {t('portal.save')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
