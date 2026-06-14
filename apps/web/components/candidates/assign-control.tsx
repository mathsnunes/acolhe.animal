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
import { assignAction } from '@/app/(admin)/candidates/actions';

export interface OrgMember {
  userId: string;
  name: string;
}

/**
 * Pick who is taking care of this candidacy. Assigning a `new` candidacy also
 * nudges it into análise — someone is now holding it.
 */
export const AssignControl = ({
  applicationId,
  members,
  assignedToUserId,
}: {
  applicationId: string;
  members: OrgMember[];
  assignedToUserId: string | null;
}) => {
  const router = useRouter();
  const t = useTranslations('candidates');
  const [pending, startTransition] = useTransition();

  const onChange = (userId: string) => {
    startTransition(async () => {
      const res = await assignAction(applicationId, userId);
      if (res.ok) {
        toast.success(t('toasts.assigned'));
        router.refresh();
      } else {
        toast.error(res.error.message);
      }
    });
  };

  return (
    <Select
      value={assignedToUserId ?? undefined}
      onValueChange={onChange}
      disabled={pending || members.length === 0}
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
  );
};
