'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { saveNotesAction } from '@/app/(admin)/candidates/actions';

/**
 * Private notes the ONG keeps about a candidacy — the "feeling" of the
 * conversation. Never shown to the candidate.
 */
export function InternalNotes({
  applicationId,
  initialNotes,
}: {
  applicationId: string;
  initialNotes: string;
}) {
  const router = useRouter();
  const t = useTranslations('candidates');
  const [notes, setNotes] = useState(initialNotes);
  const [pending, startTransition] = useTransition();

  const dirty = notes.trim() !== initialNotes.trim();

  function onSave() {
    startTransition(async () => {
      const res = await saveNotesAction(applicationId, notes.trim());
      if (res.ok) {
        toast.success(t('toasts.notesSaved'));
        router.refresh();
      } else {
        toast.error(res.error.message);
      }
    });
  }

  return (
    <div className="space-y-3">
      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder={t('notes.placeholder')}
        rows={5}
      />
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={onSave} disabled={!dirty} pending={pending}>
          {t('notes.save')}
        </Button>
      </div>
    </div>
  );
}
