'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { MoreHorizontal } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { setStatusAction } from '@/app/(admin)/candidates/actions';
import type { ApplicationStatus } from './status-meta';

type TriageStatus = 'in-progress' | 'approved' | 'rejected' | 'withdrew';

interface Step {
  status: TriageStatus;
  /** Key under `candidates.statusControl.*` for the button label. */
  labelKey: string;
  variant: 'secondary' | 'outline' | 'destructive' | 'ghost' | 'default';
  /** Secondary actions live in the "…" overflow menu instead of as buttons. */
  secondary?: boolean;
  /**
   * Ask for confirmation before committing — these are felt decisions. Keys
   * point at `candidates.statusControl.*` entries with `title` and `body`.
   */
  confirm?: { titleKey: string; bodyKey: string };
}

/** The actions available from each current status (primary as buttons, rest in the overflow). */
const stepsFor = (status: ApplicationStatus): Step[] => {
  switch (status) {
    case 'new':
      return [
        { status: 'in-progress', labelKey: 'startReview', variant: 'secondary' },
        {
          status: 'rejected',
          labelKey: 'reject',
          variant: 'ghost',
          secondary: true,
          confirm: { titleKey: 'confirmReject.title', bodyKey: 'confirmReject.bodyFromNew' },
        },
      ];
    case 'in-progress':
      return [
        {
          status: 'approved',
          labelKey: 'approve',
          variant: 'default',
          confirm: { titleKey: 'confirmApprove.title', bodyKey: 'confirmApprove.body' },
        },
        {
          status: 'rejected',
          labelKey: 'reject',
          variant: 'outline',
          confirm: { titleKey: 'confirmReject.title', bodyKey: 'confirmReject.bodyFromInProgress' },
        },
        { status: 'withdrew', labelKey: 'markWithdrew', variant: 'ghost', secondary: true },
      ];
    case 'approved':
      return [
        {
          status: 'in-progress',
          labelKey: 'backToReview',
          variant: 'outline',
          confirm: { titleKey: 'confirmBackToReview.title', bodyKey: 'confirmBackToReview.body' },
        },
        {
          status: 'rejected',
          labelKey: 'reject',
          variant: 'ghost',
          secondary: true,
          confirm: { titleKey: 'confirmReject.title', bodyKey: 'confirmReject.bodyFromInProgress' },
        },
        { status: 'withdrew', labelKey: 'markWithdrew', variant: 'ghost', secondary: true },
      ];
    // `adopted` is terminal: a formalized adoption can't be reopened or re-formalized.
    case 'adopted':
      return [];
    // `rejected` / `withdrew` / `cancelled` are closed but reopenable.
    default:
      return [{ status: 'in-progress', labelKey: 'reopen', variant: 'outline' }];
  }
};

export const StatusControl = ({
  applicationId,
  status,
  fill = false,
}: {
  applicationId: string;
  status: ApplicationStatus;
  /** Stretch the primary buttons to fill the row (mobile action bar). */
  fill?: boolean;
}) => {
  const router = useRouter();
  const t = useTranslations('candidates');
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState<Step | null>(null);

  const steps = stepsFor(status);
  const primary = steps.filter((s) => !s.secondary);
  const secondary = steps.filter((s) => s.secondary);

  const commit = (next: TriageStatus) => {
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
  };

  const onPick = (step: Step) => {
    if (step.confirm) setConfirming(step);
    else commit(step.status);
  };

  if (steps.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap items-center gap-2', fill && 'w-full')}>
      {primary.map((step) => (
        <Button
          key={step.status + step.labelKey}
          variant={step.variant}
          size="sm"
          disabled={pending}
          onClick={() => onPick(step)}
          className={cn(step.variant === 'ghost' && 'text-ink-soft hover:text-ink', fill && 'flex-1')}
        >
          {t(`statusControl.${step.labelKey}`)}
        </Button>
      ))}

      {secondary.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" disabled={pending} aria-label={t('statusControl.more')}>
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {secondary.map((step) => (
              <DropdownMenuItem key={step.status + step.labelKey} onSelect={() => onPick(step)}>
                {t(`statusControl.${step.labelKey}`)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <Dialog open={confirming !== null} onOpenChange={(o) => !o && setConfirming(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirming?.confirm && t(`statusControl.${confirming.confirm.titleKey}`)}</DialogTitle>
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
};
