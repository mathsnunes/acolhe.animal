'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
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
import { registerOfflineAction } from '@/app/(admin)/adoptions/actions';

export interface AdoptableAnimal {
  id: string;
  name: string;
}

/**
 * Register an adoption that already happened in person (fair, event). We capture
 * who adopted, the animal, the address snapshot, and the link to the signed term.
 */
export function OfflineAdoptionForm({ animals }: { animals: AdoptableAnimal[] }) {
  const router = useRouter();
  const t = useTranslations('adoptions');
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const [animalId, setAnimalId] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [document, setDocument] = useState('');
  const [email, setEmail] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [termPdfUrl, setTermPdfUrl] = useState('');
  const [adoptedAt, setAdoptedAt] = useState(() => new Date().toISOString().slice(0, 10));

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!animalId) {
      toast.error(t('toasts.chooseAnimal'));
      return;
    }
    startTransition(async () => {
      const res = await registerOfflineAction({
        animalId,
        adopter: {
          name,
          phone,
          document,
          email: email.trim() || undefined,
          postalCode: postalCode.trim() || undefined,
        },
        adopterAddress: {
          street,
          number,
          complement: complement || undefined,
          city,
          state,
          postalCode,
        },
        termPdfUrl,
        adoptedAt: new Date(adoptedAt).toISOString(),
      });
      if (res.ok) {
        toast.success(t('toasts.registered'));
        setOpen(false);
        router.refresh();
      } else {
        toast.error(res.error.message);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <Plus className="size-4" /> {t('offlineForm.trigger')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t('offlineForm.title')}</DialogTitle>
          <DialogDescription>
            {t('offlineForm.description')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>{t('offlineForm.animalLabel')}</Label>
            <Select value={animalId} onValueChange={setAnimalId} disabled={animals.length === 0}>
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    animals.length === 0
                      ? t('offlineForm.animalPlaceholderEmpty')
                      : t('offlineForm.animalPlaceholder')
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {animals.map((animal) => (
                  <SelectItem key={animal.id} value={animal.id}>
                    {animal.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="off-name">{t('offlineForm.nameLabel')}</Label>
              <Input id="off-name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="off-phone">{t('offlineForm.phoneLabel')}</Label>
              <Input
                id="off-phone"
                inputMode="tel"
                placeholder={t('offlineForm.phonePlaceholder')}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="off-cpf">{t('offlineForm.cpfLabel')}</Label>
              <Input
                id="off-cpf"
                inputMode="numeric"
                placeholder={t('offlineForm.cpfPlaceholder')}
                value={document}
                onChange={(e) => setDocument(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="off-email">{t('offlineForm.emailLabel')}</Label>
              <Input
                id="off-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
            <div className="space-y-2">
              <Label htmlFor="off-street">{t('offlineForm.streetLabel')}</Label>
              <Input
                id="off-street"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2 sm:w-28">
              <Label htmlFor="off-number">{t('offlineForm.numberLabel')}</Label>
              <Input
                id="off-number"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="off-complement">{t('offlineForm.complementLabel')}</Label>
            <Input
              id="off-complement"
              value={complement}
              onChange={(e) => setComplement(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_6rem_8rem]">
            <div className="space-y-2">
              <Label htmlFor="off-city">{t('offlineForm.cityLabel')}</Label>
              <Input id="off-city" value={city} onChange={(e) => setCity(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="off-state">{t('offlineForm.stateLabel')}</Label>
              <Input
                id="off-state"
                maxLength={2}
                value={state}
                onChange={(e) => setState(e.target.value.toUpperCase())}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="off-cep">{t('offlineForm.postalCodeLabel')}</Label>
              <Input
                id="off-cep"
                inputMode="numeric"
                placeholder={t('offlineForm.postalCodePlaceholder')}
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_10rem]">
            <div className="space-y-2">
              <Label htmlFor="off-term">{t('offlineForm.termLabel')}</Label>
              <Input
                id="off-term"
                type="url"
                placeholder={t('offlineForm.termPlaceholder')}
                value={termPdfUrl}
                onChange={(e) => setTermPdfUrl(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="off-date">{t('offlineForm.dateLabel')}</Label>
              <Input
                id="off-date"
                type="date"
                value={adoptedAt}
                onChange={(e) => setAdoptedAt(e.target.value)}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              {t('offlineForm.cancel')}
            </Button>
            <Button type="submit" variant="secondary" pending={pending}>
              {t('offlineForm.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
