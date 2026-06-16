'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { UserPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { normalizePhoneBR } from '@acolhe-animal/shared';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CityCombobox } from '@/components/auth/city-combobox';
import { maskCpf, maskPhoneBR } from '@/lib/masks';
import { createManualCandidacyAction } from '@/app/(admin)/candidates/actions';

export interface CandidacyAnimal {
  id: string;
  name: string;
}

/**
 * Staff-create a candidacy for a presential case (fair/event). Captures who +
 * which animal; the candidacy lands in the funnel as "em avaliação" and is
 * triaged like any other. On success we open the new candidacy.
 */
export const ManualCandidacyForm = ({ animals }: { animals: CandidacyAnimal[] }) => {
  const router = useRouter();
  const t = useTranslations('candidates');
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const [animalId, setAnimalId] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [cityId, setCityId] = useState<string | null>(null);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!animalId) {
      toast.error(t('manual.chooseAnimal'));
      return;
    }
    const e164 = normalizePhoneBR(phone);
    if (!e164) {
      toast.error(t('manual.phoneInvalid'));
      return;
    }
    startTransition(async () => {
      const res = await createManualCandidacyAction({
        animalId,
        person: {
          name,
          phone: e164,
          email: email.trim() || undefined,
          cpf: cpf.trim() || undefined,
          cityId: cityId ?? undefined,
        },
      });
      if (res.ok) {
        toast.success(t('manual.created'));
        setOpen(false);
        router.push(`/candidatos/${res.data.id}`);
      } else {
        toast.error(res.error.message);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <UserPlus className="size-4" /> {t('manual.trigger')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('manual.title')}</DialogTitle>
          <DialogDescription>{t('manual.description')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>{t('manual.animalLabel')}</Label>
            <Select value={animalId} onValueChange={setAnimalId} disabled={animals.length === 0}>
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    animals.length === 0 ? t('manual.animalEmpty') : t('manual.animalPlaceholder')
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {animals.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="mc-name">{t('manual.nameLabel')}</Label>
              <Input id="mc-name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mc-phone">{t('manual.phoneLabel')}</Label>
              <Input
                id="mc-phone"
                inputMode="tel"
                placeholder="(48) 99999-0000"
                value={phone}
                onChange={(e) => setPhone(maskPhoneBR(e.target.value))}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="mc-email">{t('manual.emailLabel')}</Label>
              <Input id="mc-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mc-cpf">{t('manual.cpfLabel')}</Label>
              <Input
                id="mc-cpf"
                inputMode="numeric"
                placeholder="000.000.000-00"
                value={cpf}
                onChange={(e) => setCpf(maskCpf(e.target.value))}
              />
            </div>
          </div>

          <CityCombobox
            label={t('manual.cityLabel')}
            placeholder={t('manual.cityPlaceholder')}
            emptyLabel={t('manual.cityEmpty')}
            onChange={(c) => setCityId(c?.id ?? null)}
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              {t('manual.cancel')}
            </Button>
            <Button type="submit" variant="secondary" pending={pending}>
              {t('manual.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
