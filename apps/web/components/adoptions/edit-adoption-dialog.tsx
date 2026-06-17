'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Pencil } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PhoneField } from '@/components/auth/phone-field';
import { CityCombobox } from '@/components/auth/city-combobox';
import { ResponsibleField, type ResponsibleMember } from '@/components/adoptions/responsible-field';
import { maskCep, maskCpf } from '@/lib/masks';
import { updateAdoptionAction } from '@/app/(admin)/adoptions/actions';

export interface EditAdoptionInitial {
  adopterName: string;
  document: string;
  phone: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood?: string;
  city: string;
  state: string;
  postalCode: string;
  cityText: string;
  extraClauses?: string;
}

/**
 * Correct an issued adoption: fix any value (adopter data, responsible, clauses)
 * and regenerate the term PDF. Pre-filled from the stored snapshots.
 */
export const EditAdoptionDialog = ({
  adoptionId,
  animalId,
  initial,
  responsibleMembers = [],
  initialResponsibleUserId,
}: {
  adoptionId: string;
  animalId: string;
  initial: EditAdoptionInitial;
  responsibleMembers?: ResponsibleMember[];
  initialResponsibleUserId?: string | null;
}) => {
  const router = useRouter();
  const t = useTranslations('adoptions');
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const [responsibleUserId, setResponsibleUserId] = useState(
    initialResponsibleUserId ?? responsibleMembers[0]?.userId ?? '',
  );
  const [name, setName] = useState(initial.adopterName);
  const [document, setDocument] = useState(initial.document);
  const [phone, setPhone] = useState(initial.phone);
  const [street, setStreet] = useState(initial.street);
  const [number, setNumber] = useState(initial.number);
  const [complement, setComplement] = useState(initial.complement ?? '');
  const [neighborhood, setNeighborhood] = useState(initial.neighborhood ?? '');
  const [city, setCity] = useState(initial.city);
  const [state, setState] = useState(initial.state);
  const [postalCode, setPostalCode] = useState(initial.postalCode);
  const [extraClauses, setExtraClauses] = useState(initial.extraClauses ?? '');

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await updateAdoptionAction({
        adoptionId,
        animalId,
        adopterName: name,
        adopterDocument: document,
        adopterPhone: phone,
        adopterAddress: {
          street,
          number,
          complement: complement || undefined,
          neighborhood: neighborhood || undefined,
          city,
          state,
          postalCode,
        },
        extraClauses: extraClauses.trim() || undefined,
        responsibleUserId: responsibleUserId || undefined,
      });
      if (res.ok) {
        toast.success(t('edit.saved'));
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
        <Button variant="outline" size="sm">
          <Pencil className="size-4" /> {t('edit.trigger')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t('edit.title')}</DialogTitle>
          <DialogDescription>{t('edit.description')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <ResponsibleField
            members={responsibleMembers}
            value={responsibleUserId}
            onChange={setResponsibleUserId}
          />

          <div className="space-y-2">
            <Label htmlFor="ea-name">{t('edit.nameLabel')}</Label>
            <Input id="ea-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ea-cpf">{t('edit.cpfLabel')}</Label>
              <Input
                id="ea-cpf"
                inputMode="numeric"
                value={document}
                onChange={(e) => setDocument(maskCpf(e.target.value))}
                required
              />
            </div>
            <PhoneField id="ea-phone" label={t('edit.phoneLabel')} value={phone} onChange={setPhone} />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
            <div className="space-y-2">
              <Label htmlFor="ea-street">{t('edit.streetLabel')}</Label>
              <Input id="ea-street" value={street} onChange={(e) => setStreet(e.target.value)} required />
            </div>
            <div className="space-y-2 sm:w-28">
              <Label htmlFor="ea-number">{t('edit.numberLabel')}</Label>
              <Input id="ea-number" value={number} onChange={(e) => setNumber(e.target.value)} required />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ea-complement">{t('edit.complementLabel')}</Label>
              <Input id="ea-complement" value={complement} onChange={(e) => setComplement(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ea-neighborhood">{t('edit.neighborhoodLabel')}</Label>
              <Input id="ea-neighborhood" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_8rem]">
            <CityCombobox
              label={t('edit.cityLabel')}
              placeholder={t('edit.cityPlaceholder')}
              emptyLabel={t('edit.cityEmpty')}
              initialText={initial.cityText}
              onChange={(c) => {
                if (c) {
                  setCity(c.name);
                  setState(c.stateCode);
                } else {
                  setCity('');
                  setState('');
                }
              }}
            />
            <div className="space-y-2">
              <Label htmlFor="ea-cep">{t('edit.postalCodeLabel')}</Label>
              <Input
                id="ea-cep"
                inputMode="numeric"
                value={postalCode}
                onChange={(e) => setPostalCode(maskCep(e.target.value))}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ea-extra">{t('edit.extraClausesLabel')}</Label>
            <Textarea id="ea-extra" rows={3} value={extraClauses} onChange={(e) => setExtraClauses(e.target.value)} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              {t('edit.cancel')}
            </Button>
            <Button type="submit" pending={pending}>
              {t('edit.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
