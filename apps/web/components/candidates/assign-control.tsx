'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { InitialsAvatar } from '@/components/ui/initials-avatar';
import { InlineEdit, EditTrigger } from '@/components/ui/inline-edit';
import { assignAction } from '@/app/(admin)/candidates/actions';

export interface OrgMember {
  userId: string;
  name: string;
}

/**
 * Who is taking care of this candidacy. Reads as the member's avatar + name with a
 * "trocar" affordance; choosing a member (a `Select`) returns to the read view.
 * Assigning a `new` candidacy also nudges it into análise.
 */
export const AssignControl = ({
  applicationId,
  members,
  assignedToUserId,
  currentUserId,
}: {
  applicationId: string;
  members: OrgMember[];
  assignedToUserId: string | null;
  currentUserId?: string | null;
}) => {
  const router = useRouter();
  const t = useTranslations('candidates');
  const [pending, startTransition] = useTransition();

  const assigned = members.find((m) => m.userId === assignedToUserId) ?? null;

  const onChange = (userId: string, done: () => void) => {
    startTransition(async () => {
      const res = await assignAction(applicationId, userId);
      if (res.ok) {
        toast.success(t('toasts.assigned'));
        router.refresh();
        done();
      } else {
        toast.error(res.error.message);
      }
    });
  };

  return (
    <InlineEdit>
      {({ editing, edit, done }) =>
        editing ? (
          <Select
            value={assignedToUserId ?? undefined}
            onValueChange={(u) => onChange(u, done)}
            onOpenChange={(open) => !open && done()}
            disabled={pending || members.length === 0}
            defaultOpen
          >
            <SelectTrigger>
              <SelectValue placeholder={t('assign.placeholder')} />
            </SelectTrigger>
            <SelectContent>
              {members.map((member) => (
                <SelectItem key={member.userId} value={member.userId}>
                  {member.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : assigned ? (
          <div className="flex items-center gap-2.5">
            <InitialsAvatar name={assigned.name} tone="green" />
            <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink">
              {assigned.name}
              {assigned.userId === currentUserId && (
                <span className="text-ink-mute"> {t('assign.you')}</span>
              )}
            </span>
            <EditTrigger onClick={edit}>{t('assign.change')}</EditTrigger>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-[12.5px] italic text-ink-mute">{t('assign.placeholder')}</span>
            <EditTrigger onClick={edit}>{t('assign.set')}</EditTrigger>
          </div>
        )
      }
    </InlineEdit>
  );
};
