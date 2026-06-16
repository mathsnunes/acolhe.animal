'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Undo2 } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cancelAdoptionAction } from '@/app/(admin)/adoptions/actions';

/**
 * Register a return/giveback. A returned adoption frees the animal again and
 * reopens its candidacy — so we ask for a short reason and confirm before
 * cancelling. The action stays low-emphasis on the page (the happy path is the
 * adoption staying intact).
 */
export const ReturnAdoptionDialog = ({
  adoptionId,
  animalName,
}: {
  adoptionId: string;
  animalName: string;
}) => {
  const router = useRouter();
  const t = useTranslations('adoptions');
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [reason, setReason] = useState('');

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await cancelAdoptionAction({ adoptionId, reason: reason.trim() });
      if (res.ok) {
        toast.success(t('return.toast', { animalName }));
        setOpen(false);
        router.refresh();
      } else {
        toast.error(res.error.message);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-ink-mute hover:bg-rose/10 hover:text-rose"
        >
          <Undo2 className="size-4" /> {t('return.trigger')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('return.title', { animalName })}</DialogTitle>
          <DialogDescription>{t('return.description')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="return-reason">{t('return.reasonLabel')}</Label>
            <Textarea
              id="return-reason"
              rows={3}
              placeholder={t('return.reasonPlaceholder')}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              {t('return.cancel')}
            </Button>
            <Button type="submit" variant="destructive" pending={pending} disabled={!reason.trim()}>
              {t('return.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
