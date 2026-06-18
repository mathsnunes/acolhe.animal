'use client';

import { useRef, useState, useTransition } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ImagePlus, Trash2, Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { getUploadPolicy } from '@acolhe-animal/shared';

import { Button } from '@/components/ui/button';
import { commitLogoAction, removeLogoAction, requestLogoUploadAction } from './actions';

const POLICY = getUploadPolicy('org-logo');

/** Single-file org-logo uploader: request URL → PUT bytes → commit → preview. */
export const LogoUploader = ({ initialUrl }: { initialUrl: string | null }) => {
  const router = useRouter();
  const t = useTranslations('settings');
  const [url, setUrl] = useState(initialUrl);
  const [busy, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const onPick = (file: File) => {
    if (!POLICY.accept.includes(file.type)) {
      toast.error(t('logo.typeError'));
      return;
    }
    if (file.size > POLICY.maxFileSize) {
      toast.error(t('logo.sizeError'));
      return;
    }
    startTransition(async () => {
      const ticketRes = await requestLogoUploadAction({
        filename: file.name,
        contentType: file.type,
        size: file.size,
      });
      if (!ticketRes.ok || !ticketRes.data) {
        toast.error(ticketRes.ok ? t('logo.uploadError') : ticketRes.error.message);
        return;
      }
      const ticket = ticketRes.data;
      try {
        const put = await fetch(ticket.url, { method: 'PUT', headers: ticket.headers, body: file });
        if (!put.ok) throw new Error(String(put.status));
      } catch {
        toast.error(t('logo.uploadError'));
        return;
      }
      const committed = await commitLogoAction(ticket.uploadId);
      if (!committed.ok) {
        toast.error(committed.error.message);
        return;
      }
      setUrl(committed.data.logoUrl);
      toast.success(t('logo.saved'));
      router.refresh();
    });
  };

  const onRemove = () => {
    startTransition(async () => {
      const res = await removeLogoAction();
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      setUrl(null);
      toast.success(t('logo.removed'));
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-5 rounded-xl border border-line bg-bg-2/40 p-5 sm:flex-row sm:items-center sm:gap-6">
      <div className="flex h-28 w-full shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-bg-2 p-3 sm:w-48">
        {url ? (
          <Image
            src={url}
            alt={t('logo.label')}
            width={176}
            height={104}
            className="max-h-full w-auto max-w-full object-contain"
            unoptimized
          />
        ) : (
          <div className="flex flex-col items-center gap-1.5 text-ink-mute">
            <ImagePlus className="size-6" aria-hidden />
            <span className="text-xs">{t('logo.empty')}</span>
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-3">
        <div>
          <p className="text-sm font-medium text-ink">{t('logo.title')}</p>
          <p className="hint mt-1">{t('logo.hint')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" pending={busy} onClick={() => inputRef.current?.click()}>
            <Upload className="size-4" /> {url ? t('logo.change') : t('logo.upload')}
          </Button>
          {url && (
            <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={onRemove} className="text-ink-mute hover:text-rose">
              <Trash2 className="size-4" /> {t('logo.remove')}
            </Button>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={POLICY.accept.join(',')}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onPick(file);
          e.target.value = '';
        }}
      />
    </div>
  );
};
