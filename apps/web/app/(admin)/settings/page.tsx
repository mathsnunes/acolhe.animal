import { eq } from 'drizzle-orm';
import { getTranslations } from 'next-intl/server';

import { city, db } from '@acolhe-animal/db';
import { formatCep, formatCnpj, formatCpf, formatPhoneBR } from '@acolhe-animal/shared';
import { getOrganizationByPk } from '@acolhe-animal/domain';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { requireCtx } from '@/lib/auth-context';
import { OrgSettingsForm, type OrgSettingsInitial } from './org-settings-form';
import { PortalSettingsCard } from './portal-settings-card';

export const dynamic = 'force-dynamic';

export default async function ConfigPage() {
  const ctx = await requireCtx();
  const t = await getTranslations('settings');
  const org = await getOrganizationByPk(db, ctx.organizationId);
  if (!org) throw new Error('Organização não encontrada.');
  const cityRow = org.cityId
    ? (
        await db
          .select({ name: city.name, uf: city.stateCode })
          .from(city)
          .where(eq(city.id, org.cityId))
          .limit(1)
      )[0]
    : undefined;

  const isAdmin = ctx.actor.type === 'user' && ctx.actor.role === 'admin';
  const cityText = cityRow ? `${cityRow.name}, ${cityRow.uf}` : '';
  const documentDisplay =
    org.documentType === 'cnpj' ? formatCnpj(org.document) : formatCpf(org.document);
  const financeStatusKey = `finance.status.${org.asaasOnboardingStatus}` as const;

  const initial: OrgSettingsInitial = {
    name: org.name,
    logoUrl: org.logoUrl ?? null,
    documentType: org.documentType,
    document: documentDisplay,
    phone: formatPhoneBR(org.phone),
    email: org.email ?? '',
    cityId: org.cityId ?? null,
    cityText,
    streetAddress: org.streetAddress ?? '',
    addressNumber: org.addressNumber ?? '',
    addressComplement: org.addressComplement ?? '',
    postalCode: org.postalCode ? formatCep(org.postalCode) : '',
    aboutText: org.aboutText ?? '',
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-8 sm:px-10">
      <p className="eyebrow mb-2">— {t('eyebrow')}</p>
      <h1 className="display text-4xl text-ink">{t('title')}</h1>

      <div className="mt-8 grid gap-5">
        {isAdmin ? (
          <>
            <OrgSettingsForm initial={initial} />
            <PortalSettingsCard initialEnabled={org.portalEnabled} initialSlug={org.slug ?? ''} />
          </>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>{t('orgCard.title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row label={t('orgCard.name')} value={org.name} />
              <Row
                label={t('portal.title')}
                value={org.portalEnabled && org.slug ? `acolhe.animal/${org.slug}` : t('portal.disabled')}
                mono={org.portalEnabled && !!org.slug}
              />
              <Row
                label={org.documentType === 'cnpj' ? t('orgCard.cnpj') : t('orgCard.cpf')}
                value={documentDisplay}
              />
              {cityText && <Row label={t('orgCard.city')} value={cityText} />}
              <Row label={t('orgCard.phone')} value={formatPhoneBR(org.phone)} />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>{t('finance.title')}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between text-sm">
            <div>
              <p className="text-ink-soft">
                {org.documentType === 'cnpj'
                  ? t('finance.descriptionCnpj')
                  : t('finance.descriptionCpf')}
              </p>
            </div>
            <Badge variant={org.asaasOnboardingStatus === 'approved' ? 'success' : 'outline'}>
              {t(financeStatusKey)}
            </Badge>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const Row = ({ label, value, mono }: { label: string; value: string; mono?: boolean }) => <div className="flex items-center justify-between gap-4">
      <span className="text-ink-mute">{label}</span>
      <span className={mono ? 'font-mono text-xs text-ink' : 'text-ink'}>{value}</span>
    </div>;
