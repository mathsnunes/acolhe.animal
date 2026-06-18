'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FinanceStepper } from '../_components/finance-stepper';
import { AsaasFooter } from '../_components/asaas-footer';
import { confirmAndCreateAction } from '../actions';
import type { ConfirmDataFields } from '@acolhe-animal/domain';

interface Props {
  fields: ConfirmDataFields;
}

export const ConfirmDataState = ({ fields }: Props) => {
  const t = useTranslations('finance');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [companyType, setCompanyType] = useState(fields.companyType ?? '');
  const [birthDate, setBirthDate] = useState(fields.responsibleBirthDate ?? '');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    setError(null);
    startTransition(async () => {
      const result = await confirmAndCreateAction({
        companyType: companyType as 'MEI' | 'LIMITED' | 'INDIVIDUAL' | 'ASSOCIATION',
        responsibleBirthDate: birthDate,
      });
      if (!result.ok) {
        setError(result.error.message);
      } else {
        router.refresh();
      }
    });
  };

  const ReadField = ({ label, value }: { label: string; value: string }) => (
    <div className="bg-paper p-3">
      <div className="mb-1 text-[11px] uppercase tracking-[.04em] text-ink-mute">{label}</div>
      <div className="text-[14.5px] font-medium">{value}</div>
    </div>
  );

  return (
    <div>
      <FinanceStepper activeStep="data" />
      <div className="card">
        <div className="eyebrow-mute mb-4">— Confirme seus dados</div>
        <h2 className="display mb-3 text-2xl">
          Antes de criar a conta, <em className="text-terra">confira se está tudo certo</em>
        </h2>
        <p className="mb-6 text-[15px] text-ink-soft">{t('confirmData.desc')}</p>

        <div className="mb-6">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-[11px] font-medium uppercase tracking-[.18em] text-ink-mute">
              {t('confirmData.sectionOrg')}
            </span>
            <span className="rounded-full bg-[#E4EEE7] px-2 py-0.5 text-[10px] font-medium text-green-soft">
              {t('confirmData.alreadyHave')}
            </span>
          </div>
          <div className="grid grid-cols-2 divide-x divide-y divide-line overflow-hidden rounded-[10px] border border-line">
            <ReadField label="Nome" value={fields.name} />
            <ReadField label={fields.documentType === 'cnpj' ? 'CNPJ' : 'CPF'} value={fields.document} />
            <ReadField label="E-mail" value={fields.email ?? '—'} />
            <ReadField label="Telefone" value={fields.phone} />
          </div>
        </div>

        {fields.streetAddress && (
          <div className="mb-6">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-[11px] font-medium uppercase tracking-[.18em] text-ink-mute">
                {t('confirmData.sectionAddress')}
              </span>
              <span className="rounded-full bg-[#E4EEE7] px-2 py-0.5 text-[10px] font-medium text-green-soft">
                {t('confirmData.alreadyHave')}
              </span>
            </div>
            <div className="grid grid-cols-2 divide-x divide-y divide-line overflow-hidden rounded-[10px] border border-line">
              <ReadField label="Logradouro" value={`${fields.streetAddress}, ${fields.addressNumber ?? ''}`} />
              <ReadField label="CEP" value={fields.postalCode ?? '—'} />
            </div>
          </div>
        )}

        <div className="mb-6">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-[11px] font-medium uppercase tracking-[.18em] text-ink-mute">
              {t('confirmData.sectionResponsible')}
            </span>
            <span className="rounded-full bg-terra-bg px-2 py-0.5 text-[10px] font-medium text-terra">
              {t('confirmData.stillNeed')}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-ink-soft">
                {t('confirmData.companyTypeLabel')} <span className="text-terra">•</span>
              </label>
              <Select value={companyType} onValueChange={setCompanyType}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MEI">{t('confirmData.companyTypeMEI')}</SelectItem>
                  <SelectItem value="ASSOCIATION">{t('confirmData.companyTypeASSOCIATION')}</SelectItem>
                  <SelectItem value="LIMITED">{t('confirmData.companyTypeLIMITED')}</SelectItem>
                  <SelectItem value="INDIVIDUAL">{t('confirmData.companyTypeINDIVIDUAL')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-ink-soft">
                {t('confirmData.birthDateLabel')} <span className="text-terra">•</span>
              </label>
              <Input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
              />
            </div>
          </div>
          <p className="hint mt-2">{t('confirmData.whyWeAsk')}</p>
        </div>

        {error && (
          <div className="mb-4 rounded-[10px] bg-[#FBEFEF] p-4 text-[13.5px] text-[#8a4a4a]">
            {error}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button
            className="rounded-full px-7"
            onClick={handleSubmit}
            disabled={isPending || !companyType || !birthDate}
          >
            {isPending ? 'Criando conta…' : t('confirmData.cta')}
          </Button>
          <Button variant="ghost" asChild>
            <a href="/config/financeiro">{t('confirmData.back')}</a>
          </Button>
        </div>
        <AsaasFooter />
      </div>
    </div>
  );
};
