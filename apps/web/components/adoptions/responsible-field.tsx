'use client';

import { useTranslations } from 'next-intl';

import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface ResponsibleMember {
  userId: string;
  name: string;
  phone: string;
}

/**
 * Picks the member who conducted the adoption (shown as the term's "responsável").
 * Renders nothing when there are no members to choose from.
 */
export const ResponsibleField = ({
  members,
  value,
  onChange,
}: {
  members: ResponsibleMember[];
  value: string;
  onChange: (userId: string) => void;
}) => {
  const t = useTranslations('adoptions');
  if (members.length === 0) return null;

  return (
    <div className="space-y-2">
      <Label>{t('responsible.label')}</Label>
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder={t('responsible.placeholder')} />
        </SelectTrigger>
        <SelectContent>
          {members.map((m) => (
            <SelectItem key={m.userId} value={m.userId}>
              {m.name === m.phone ? m.phone : `${m.name} · ${m.phone}`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="hint">{t('responsible.hint')}</p>
    </div>
  );
};
