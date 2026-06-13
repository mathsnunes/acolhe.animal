'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { setStatusAction } from '@/app/(admin)/candidates/actions';
import type { ApplicationStatus } from './status-meta';

type TriageStatus = 'in-progress' | 'approved' | 'rejected' | 'withdrew';

interface Step {
  status: TriageStatus;
  /** Key under `candidates.statusControl.*` for the button label. */
  labelKey: string;
  variant: 'secondary' | 'outline' | 'destructive' | 'ghost';
  /**
   * Ask for confirmation before committing — these are felt decisions. Keys
   * point at `candidates.statusControl.*` entries with `title` and `body`.
   */
  confirm?: { titleKey: string; bodyKey: string };
}

/** The actions available from each current status. */
function stepsFor(status: ApplicationStatus): Step[] {
  switch (status) {
    case 'new':
      return [
        { status: 'in-progress', labelKey: 'startReview', variant: 'secondary' },
        {
          status: 'rejected',
          labelKey: 'reject',
          variant: 'ghost',
          confirm: {
            titleKey: 'confirmReject.title',
            bodyKey: 'confirmReject.bodyFromNew',
          },
        },
      ];
    case 'in-progress':
      return [
        {
          status: 'approved',
          labelKey: 'approve',
          variant: 'secondary',
          confirm: {
            titleKey: 'confirmApprove.title',
            bodyKey: 'confirmApprove.body',
          },
        },
        {
          status: 'rejected',
          labelKey: 'reject',
          variant: 'ghost',
          confirm: {
            titleKey: 'confirmReject.title',
            bodyKey: 'confirmReject.bodyFromInProgress',
          },
        },
        { status: 'withdrew', labelKey: 'markWithdrew', variant: 'ghost' },
      ];
    case 'approved':
      return [
        {
          status: 'in-progress',
          labelKey: 'backToReview',
          variant: 'outline',
          confirm: {
            titleKey: 'confirmBackToReview.title',
            bodyKey: 'confirmBackToReview.body',
          },
        },
      ];
    default:
      return [
        { status: 'in-progress', labelKey: 'reopen', variant: 'outline' },
      ];
  }
}

export function StatusControl({
  applicationId,
  status,
}: {
  applicationId: string;
  status: ApplicationStatus;
}) {
  const router = useRouter();
  const t = useTranslations('candidates');
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState<Step | null>(null);

  const steps = stepsFor(status);

  function commit(next: TriageStatus) {
    startTransition(async () => {
      const res = await setStatusAction(applicationId, next);
      if (res.ok) {
        toast.success(t('toasts.statusUpdated'));
        router.refresh();
      } else {
        toast.error(res.error.message);
      }
      setConfirming(null);
    });
  }

  function onClick(step: Step) {
    if (step.confirm) setConfirming(step);
    else commit(step.status);
  }

  if (steps.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {steps.map((step) => (
        <Button
          key={step.status + step.labelKey}
          variant={step.variant}
          size="sm"
          disabled={pending}
          onClick={() => onClick(step)}
          className={cn(step.variant === 'ghost' && 'text-ink-soft hover:text-ink')}
        >
          {t(`statusControl.${step.labelKey}`)}
        </Button>
      ))}

      <Dialog open={confirming !== null} onOpenChange={(o) => !o && setConfirming(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirming?.confirm && t(`statusControl.${confirming.confirm.titleKey}`)}
            </DialogTitle>
            <DialogDescription>
              {confirming?.confirm && t(`statusControl.${confirming.confirm.bodyKey}`)}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirming(null)} disabled={pending}>
              {t('statusControl.cancel')}
            </Button>
            <Button
              variant={confirming?.status === 'rejected' ? 'destructive' : 'secondary'}
              pending={pending}
              onClick={() => confirming && commit(confirming.status)}
            >
              {t('statusControl.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
