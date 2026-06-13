'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Archive, ArchiveRestore } from 'lucide-react';
import { toast } from 'sonner';

import type { ActionResult } from '@acolhe-animal/shared';

import { Button } from '@/components/ui/button';

/**
 * Archive / unarchive toggle for the detail header. Wraps the bound Server
 * Action, shows a toast and refreshes the route on success.
 */
export function ArchiveButton({
  archived,
  action,
}: {
  archived: boolean;
  action: () => Promise<ActionResult>;
}) {
  const t = useTranslations('animals');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function run() {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        toast.success(archived ? t('toasts.reactivated') : t('toasts.archived'));
        router.refresh();
      } else {
        toast.error(result.error.message);
      }
    });
  }

  return (
    <Button type="button" variant="outline" onClick={run} pending={isPending}>
      {archived ? <ArchiveRestore /> : <Archive />}
      {archived ? t('actions.reactivate') : t('actions.archive')}
    </Button>
  );
}
