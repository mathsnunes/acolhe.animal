'use client';

import { Check, Copy, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { formatDateBR, formatPhoneBR, normalizePhoneBR } from '@acolhe-animal/shared';

import { PhoneField } from '@/components/auth/phone-field';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InitialsAvatar } from '@/components/ui/initials-avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { changeRoleAction, inviteMemberAction, removeMemberAction, revokeInviteAction } from './actions';

type Role = 'admin' | 'volunteer';

interface Member {
  id: string;
  name: string;
  phone: string;
  role: Role;
  joinedAt: string | Date;
  isSelf: boolean;
}
interface Invite {
  id: string;
  phone: string;
  name: string | null;
  role: Role;
  invitedAt: string | Date;
  expiresAt: string | Date;
  token: string;
}

const CopyLink = ({ url }: { url: string }) => {
  const t = useTranslations('members');
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };
  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1.5 text-[13px] font-medium text-terra hover:underline hover:underline-offset-2"
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {copied ? t('copied') : t('copyLink')}
    </button>
  );
};

export const MembersManager = ({ members, invites, baseUrl }: { members: Member[]; invites: Invite[]; baseUrl: string }) => {
  const t = useTranslations('members');
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('volunteer');
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null);

  const roleLabel = (r: Role) => (r === 'admin' ? t('roleAdmin') : t('roleVolunteer'));

  const submitInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!normalizePhoneBR(phone)) return toast.error(t('invalidPhone'));
    startTransition(async () => {
      const res = await inviteMemberAction({ phone, name: name || undefined, role });
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      setLastInviteUrl(res.data.acceptUrl);
      setPhone('');
      setName('');
      setRole('volunteer');
      toast.success(t('inviteSent'));
      router.refresh();
    });
  };

  const onChangeRole = (memberId: string, next: Role) =>
    startTransition(async () => {
      const res = await changeRoleAction(memberId, next);
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      toast.success(t('roleChanged'));
      router.refresh();
    });

  const onRemove = (memberId: string, label: string) =>
    startTransition(async () => {
      const res = await removeMemberAction(memberId);
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      toast.success(t('memberRemoved', { name: label }));
      router.refresh();
    });

  const onRevoke = (inviteId: string) =>
    startTransition(async () => {
      const res = await revokeInviteAction(inviteId);
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      toast.success(t('inviteRevoked'));
      router.refresh();
    });

  return (
    <div className="grid gap-5">
      {/* Invite */}
      <Card>
        <CardHeader>
          <CardTitle>{t('inviteTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submitInvite} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <PhoneField id="inv-phone" label={t('invitePhone')} value={phone} onChange={setPhone} />
            <div className="space-y-1.5">
              <Label htmlFor="inv-name" className="text-[13px]">
                {t('inviteName')}
              </Label>
              <Input id="inv-name" placeholder={t('inviteNamePlaceholder')} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px]">{t('inviteRole')}</Label>
              <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="volunteer">{t('roleVolunteer')}</SelectItem>
                  <SelectItem value="admin">{t('roleAdmin')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" pending={pending} className="sm:col-span-3 sm:justify-self-start">
              {t('inviteSubmit')}
            </Button>
          </form>

          {lastInviteUrl ? (
            <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-terra-bg px-4 py-3">
              <span className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-ink-soft">{lastInviteUrl}</span>
              <CopyLink url={lastInviteUrl} />
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Active members */}
      <Card>
        <CardHeader>
          <CardTitle>{t('membersTitle', { count: members.length })}</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-line-soft">
          {members.map((m) => (
            <div
              key={m.id}
              className="flex flex-col gap-2.5 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:gap-3"
            >
              <div className="flex min-w-0 items-center gap-3 sm:flex-1">
                <InitialsAvatar name={m.name} tone="green" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-ink">{m.name}</span>
                    {m.isSelf ? <span className="shrink-0 text-[11px] text-ink-mute">· {t('you')}</span> : null}
                  </div>
                  <div className="truncate text-[12px] text-ink-mute">{formatPhoneBR(m.phone)}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 pl-11 sm:pl-0">
                <Select value={m.role} onValueChange={(v) => onChangeRole(m.id, v as Role)} disabled={m.isSelf || pending}>
                  <SelectTrigger className="h-9 w-full sm:w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="volunteer">{t('roleVolunteer')}</SelectItem>
                    <SelectItem value="admin">{t('roleAdmin')}</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t('remove')}
                  disabled={m.isSelf || pending}
                  onClick={() => onRemove(m.id, m.name)}
                  className="shrink-0 text-ink-mute hover:text-rose"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Pending invites */}
      {invites.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('pendingTitle', { count: invites.length })}</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-line-soft">
            {invites.map((inv) => (
              <div key={inv.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm text-ink">
                    <span className="font-medium">{inv.name || formatPhoneBR(inv.phone)}</span>
                    <span className="rounded-full bg-bg-2 px-2 py-0.5 text-[11px] text-ink-soft">{roleLabel(inv.role)}</span>
                  </div>
                  <div className="text-[12px] text-ink-mute">
                    {formatPhoneBR(inv.phone)} · {t('expiresOn', { date: formatDateBR(inv.expiresAt) })}
                  </div>
                </div>
                <CopyLink url={`${baseUrl}/convite/${inv.token}`} />
                <Button variant="ghost" size="sm" disabled={pending} onClick={() => onRevoke(inv.id)} className="text-ink-mute hover:text-rose">
                  {t('revoke')}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
};
