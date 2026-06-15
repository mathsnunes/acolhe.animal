'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { InlineEdit, EditTrigger } from '@/components/ui/inline-edit';
import { saveNotesAction } from '@/app/(admin)/candidates/actions';

/**
 * Private notes the ONG keeps about a candidacy — the "feeling" of the
 * conversation. Never shown to the candidate. Reads as prose with an "editar"
 * affordance; editing swaps to a textarea and returns to the read view on save.
 */
export const InternalNotes = ({
  applicationId,
  initialNotes,
}: {
  applicationId: string;
  initialNotes: string;
}) => {
  const t = useTranslations('candidates');

  return (
    <section className="section-card bg-bg-2 p-6 sm:p-7">
      <InlineEdit>
        {({ editing, edit, done }) => (
          <>
            <div className="mb-3 flex items-center justify-between">
              <p className="eyebrow eyebrow-mute">{t('detail.notesEyebrow')}</p>
              {!editing && (
                <EditTrigger onClick={edit}>
                  {initialNotes.trim() ? t('notes.edit') : t('notes.add')}
                </EditTrigger>
              )}
            </div>
            {editing ? (
              <NotesEditor applicationId={applicationId} initialNotes={initialNotes} onDone={done} />
            ) : initialNotes.trim() ? (
              <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-ink">{initialNotes}</p>
            ) : (
              <p className="text-[13px] text-ink-mute">{t('notes.empty')}</p>
            )}
          </>
        )}
      </InlineEdit>
    </section>
  );
};

const NotesEditor = ({
  applicationId,
  initialNotes,
  onDone,
}: {
  applicationId: string;
  initialNotes: string;
  onDone: () => void;
}) => {
  const router = useRouter();
  const t = useTranslations('candidates');
  const [notes, setNotes] = useState(initialNotes);
  const [pending, startTransition] = useTransition();

  const onSave = () => {
    startTransition(async () => {
      const res = await saveNotesAction(applicationId, notes.trim());
      if (res.ok) {
        toast.success(t('toasts.notesSaved'));
        router.refresh();
        onDone();
      } else {
        toast.error(res.error.message);
      }
    });
  };

  return (
    <div className="space-y-3">
      <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('notes.placeholder')} rows={5} autoFocus />
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onDone} disabled={pending}>
          {t('statusControl.cancel')}
        </Button>
        <Button size="sm" variant="outline" onClick={onSave} pending={pending}>
          {t('notes.save')}
        </Button>
      </div>
    </div>
  );
};
