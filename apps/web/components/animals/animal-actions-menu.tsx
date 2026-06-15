'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Archive, ArchiveRestore, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';

import type { ActionResult } from '@acolhe-animal/shared';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/**
 * The detail header's "Mais ações" overflow menu. For now it only carries the
 * archive / unarchive toggle (the prototype's other entries — generate art,
 * etc. — land once their flows exist). Wraps the bound Server Action, toasts and
 * refreshes on success.
 */
export const AnimalActionsMenu = ({
  archived,
  action,
}: {
  archived: boolean;
  action: () => Promise<ActionResult>;
}) => {
  const t = useTranslations('animals');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const run = () => {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        toast.success(archived ? t('toasts.reactivated') : t('toasts.archived'));
        router.refresh();
      } else {
        toast.error(result.error.message);
      }
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isPending}>
          <MoreHorizontal />
          {t('detail.moreActions')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          className="gap-2"
          onSelect={(e) => {
            e.preventDefault();
            run();
          }}
        >
          {archived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
          {archived ? t('actions.reactivate') : t('actions.archive')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
