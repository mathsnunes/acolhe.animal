'use client';

import { useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Users } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { rejectOtherCandidatesAction } from '@/app/(admin)/animals/actions';

/**
 * Once an animal is adopted, the other candidacies still open shouldn't shout —
 * but we keep them visible (to reject the rest, or as a record if the adoption is
 * later returned). This renders that quiet line plus a low-key "recusar restantes"
 * that batch-rejects them after a confirmation.
 */
export const OpenCandidaciesNote = ({
  animalId,
  count,
  viewHref,
}: {
  animalId: string;
  count: number;
  viewHref: string;
}) => {
  const router = useRouter();
  const t = useTranslations('animals');
  const [pending, startTransition] = useTransition();

  const onReject = () => {
    startTransition(async () => {
      const res = await rejectOtherCandidatesAction(animalId);
      if (res.ok) {
        toast.success(t('detail.rejectRemainingToast', { count: res.data }));
        router.refresh();
      } else {
        toast.error(res.error.message);
      }
    });
  };

  return (
    <div className="mt-9 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line-soft bg-paper px-4 py-3">
      <div className="flex min-w-0 items-center gap-2.5 text-[12.5px] text-ink-soft">
        <Users className="size-4 shrink-0 text-ink-mute" aria-hidden />
        <span>{t('detail.otherCandidacies', { count })}</span>
        <Link href={viewHref} className="text-terra hover:underline">
          · {t('detail.otherCandidaciesView')}
        </Link>
      </div>

      <Dialog>
        <DialogTrigger asChild>
          <button
            type="button"
            className="whitespace-nowrap text-[12px] text-ink-mute transition hover:text-rose"
          >
            {t('detail.rejectRemaining')}
          </button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('detail.rejectRemainingTitle', { count })}</DialogTitle>
            <DialogDescription>{t('detail.rejectRemainingDescription')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogTrigger asChild>
              <Button type="button" variant="outline" disabled={pending}>
                {t('detail.rejectRemainingCancel')}
              </Button>
            </DialogTrigger>
            <Button type="button" variant="destructive" pending={pending} onClick={onReject}>
              {t('detail.rejectRemainingConfirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
