'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

import { normalizePhoneBR } from '@acolhe-animal/shared';

import { Field } from '@/components/auth/field';
import { PhoneField } from '@/components/auth/phone-field';
import { DocumentField } from '@/components/auth/document-field';
import { CityCombobox } from '@/components/auth/city-combobox';
import { maskCep } from '@/lib/masks';
import { LogoUploader } from './logo-uploader';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { updateOrgAction } from './actions';

export interface OrgSettingsInitial {
  name: string;
  logoUrl: string | null;
  documentType: 'cnpj' | 'cpf';
  document: string;
  phone: string;
  email: string;
  cityId: string | null;
  cityText: string;
  streetAddress: string;
  addressNumber: string;
  addressComplement: string;
  postalCode: string;
  aboutText: string;
}

/** Editable org identity + contact card (admin). Mirrors the signup org step. */
export const OrgSettingsForm = ({ initial }: { initial: OrgSettingsInitial }) => {
  const router = useRouter();
  const t = useTranslations('settings');
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [name, setName] = useState(initial.name);
  const [document, setDocument] = useState(initial.document);
  const [phone, setPhone] = useState(initial.phone);
  const [email, setEmail] = useState(initial.email);
  const [cityId, setCityId] = useState<string | null>(initial.cityId);
  const [street, setStreet] = useState(initial.streetAddress);
  const [number, setNumber] = useState(initial.addressNumber);
  const [complement, setComplement] = useState(initial.addressComplement);
  const [postalCode, setPostalCode] = useState(initial.postalCode);
  const [about, setAbout] = useState(initial.aboutText);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErrors({});
    const e164 = normalizePhoneBR(phone);
    if (!e164) {
      setErrors({ phone: t('edit.phoneInvalid') });
      return;
    }
    startTransition(async () => {
      const res = await updateOrgAction({
        name,
        document,
        phone: e164,
        email: email.trim() || undefined,
        cityId: cityId ?? undefined,
        streetAddress: street.trim() || undefined,
        addressNumber: number.trim() || undefined,
        addressComplement: complement.trim() || undefined,
        postalCode: postalCode.trim() || undefined,
        aboutText: about.trim() || undefined,
      });
      if (res.ok) {
        toast.success(t('edit.saved'));
        router.refresh();
      } else {
        if (res.error.fields) setErrors(res.error.fields);
        toast.error(res.error.message);
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('orgCard.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <LogoUploader initialUrl={initial.logoUrl} />
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label={t('edit.nameLabel')} htmlFor="set-name" error={errors.name}>
            <Input id="set-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>

          <DocumentField
            value={document}
            onChange={setDocument}
            type={initial.documentType === 'cnpj' ? 'ong' : 'protetor'}
            label={initial.documentType === 'cnpj' ? t('orgCard.cnpj') : t('orgCard.cpf')}
            error={errors.document}
            required={initial.documentType === 'cnpj'}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <PhoneField id="set-phone" label={t('orgCard.phone')} value={phone} onChange={setPhone} error={errors.phone} />
            <Field label={t('edit.emailLabel')} htmlFor="set-email" error={errors.email}>
              <Input id="set-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
          </div>

          <CityCombobox
            label={t('orgCard.city')}
            placeholder={t('edit.cityPlaceholder')}
            emptyLabel={t('edit.cityEmpty')}
            initialText={initial.cityText}
            onChange={(c) => setCityId(c?.id ?? null)}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_8rem]">
            <Field label={t('edit.streetLabel')} htmlFor="set-street">
              <Input id="set-street" value={street} onChange={(e) => setStreet(e.target.value)} />
            </Field>
            <Field label={t('edit.numberLabel')} htmlFor="set-number">
              <Input id="set-number" value={number} onChange={(e) => setNumber(e.target.value)} />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t('edit.complementLabel')} htmlFor="set-complement">
              <Input id="set-complement" value={complement} onChange={(e) => setComplement(e.target.value)} />
            </Field>
            <Field label={t('edit.postalCodeLabel')} htmlFor="set-cep">
              <Input id="set-cep" inputMode="numeric" value={postalCode} onChange={(e) => setPostalCode(maskCep(e.target.value))} />
            </Field>
          </div>

          <Field label={t('edit.aboutLabel')} htmlFor="set-about" hint={t('edit.aboutHint')}>
            <Textarea id="set-about" rows={3} value={about} onChange={(e) => setAbout(e.target.value)} />
          </Field>

          <div className="flex justify-end">
            <Button type="submit" pending={pending}>
              {t('edit.save')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
