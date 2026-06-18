'use client';

import { useState, useRef } from 'react';
import { FileText, Loader2, CheckCircle, ExternalLink } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { uploadDocumentAction, refreshDocumentsAction } from '../actions';
import type { DocumentItem } from '@acolhe-animal/domain';

interface Props {
  doc: DocumentItem;
  onStatusChange?: () => void;
}

export const DocumentUploadItem = ({ doc, onStatusChange }: Props) => {
  const t = useTranslations('finance');
  const [state, setState] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [awaitingExternal, setAwaitingExternal] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setState('uploading');
    setErrorMsg(null);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('docId', doc.id);
    const result = await uploadDocumentAction(fd);
    if (result.ok) {
      setState('done');
      onStatusChange?.();
    } else {
      setState('error');
      setErrorMsg(result.error.message);
    }
  };

  const handleExternalClick = () => {
    window.open(doc.onboardingUrl, '_blank', 'noopener,noreferrer');
    setAwaitingExternal(true);
  };

  const handleRefresh = async () => {
    await refreshDocumentsAction();
    onStatusChange?.();
  };

  return (
    <div className="flex items-center gap-4 rounded-lg border border-line bg-bg p-4">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-terra-bg text-terra">
        <FileText className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[14.5px] font-medium">{doc.label}</div>
        {errorMsg && <div className="mt-1 text-[12px] text-rose-600">{errorMsg}</div>}
        {awaitingExternal && state !== 'done' && (
          <div className="mt-1 text-[12px] text-ink-mute">{t('documentsPending.awaitingExternal')}</div>
        )}
      </div>

      {state === 'done' ? (
        <span className="flex items-center gap-1 rounded-full bg-[#E4EEE7] px-3 py-1 text-[10px] font-medium uppercase tracking-[.1em] text-green-soft">
          <CheckCircle className="size-3" /> {t('documentsPending.tagDone')}
        </span>
      ) : state === 'uploading' ? (
        <Loader2 className="size-5 animate-spin text-ink-mute" />
      ) : doc.externalOnly ? (
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Button
            variant="outline"
            size="sm"
            className="text-[12px]"
            onClick={handleExternalClick}
          >
            <ExternalLink className="mr-1 size-3" />
            {t('documentsPending.externalButton')}
          </Button>
          {awaitingExternal && (
            <button
              className="text-[11px] text-terra underline underline-offset-2"
              onClick={handleRefresh}
            >
              {t('documentsPending.refreshStatus')}
            </button>
          )}
        </div>
      ) : (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 text-[12px]"
            onClick={() => inputRef.current?.click()}
          >
            {t('documentsPending.tagUpload')}
          </Button>
        </>
      )}
    </div>
  );
};
