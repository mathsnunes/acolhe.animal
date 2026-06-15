'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { HeartHandshake } from 'lucide-react';
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
import { finalizeAdoptionAction } from '@/app/(admin)/candidates/actions';

/**
 * The happy ending: collect the adopter's CPF + address and the term's extra
 * clauses, then formalize a digital adoption. On success we land on the new
 * adoption record.
 */
export const FinalizeAdoptionDialog = ({
  applicationId,
  adopterName,
  animalName,
}: {
  applicationId: string;
  adopterName: string;
  animalName: string;
}) => {
  const router = useRouter();
  const t = useTranslations('candidates');
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const [document, setDocument] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [extraClauses, setExtraClauses] = useState('');

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await finalizeAdoptionAction({
        applicationId,
        adopterDocument: document,
        adopterAddress: {
          street,
          number,
          complement: complement || undefined,
          city,
          state,
          postalCode,
        },
        extraClauses: extraClauses.trim() || undefined,
        signature: {
          ip: '',
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        },
      });
      if (res.ok) {
        toast.success(t('toasts.adoptionFinalized', { animalName }));
        setOpen(false);
        router.push(`/adocoes/${res.data.id}`);
      } else {
        toast.error(res.error.message);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="lg" className="w-full">
          <HeartHandshake className="size-4" /> {t('finalize.trigger')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t('finalize.title', { animalName })}</DialogTitle>
          <DialogDescription>
            {t('finalize.description', { adopterName })}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cpf">{t('finalize.cpfLabel')}</Label>
            <Input
              id="cpf"
              inputMode="numeric"
              placeholder={t('finalize.cpfPlaceholder')}
              value={document}
              onChange={(e) => setDocument(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
            <div className="space-y-2">
              <Label htmlFor="street">{t('finalize.streetLabel')}</Label>
              <Input
                id="street"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2 sm:w-28">
              <Label htmlFor="number">{t('finalize.numberLabel')}</Label>
              <Input
                id="number"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="complement">{t('finalize.complementLabel')}</Label>
            <Input
              id="complement"
              value={complement}
              onChange={(e) => setComplement(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_6rem_8rem]">
            <div className="space-y-2">
              <Label htmlFor="city">{t('finalize.cityLabel')}</Label>
              <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">{t('finalize.stateLabel')}</Label>
              <Input
                id="state"
                maxLength={2}
                value={state}
                onChange={(e) => setState(e.target.value.toUpperCase())}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postalCode">{t('finalize.postalCodeLabel')}</Label>
              <Input
                id="postalCode"
                inputMode="numeric"
                placeholder={t('finalize.postalCodePlaceholder')}
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="extraClauses">{t('finalize.extraClausesLabel')}</Label>
            <Textarea
              id="extraClauses"
              rows={3}
              placeholder={t('finalize.extraClausesPlaceholder')}
              value={extraClauses}
              onChange={(e) => setExtraClauses(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              {t('finalize.cancel')}
            </Button>
            <Button type="submit" variant="secondary" pending={pending}>
              {t('finalize.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
