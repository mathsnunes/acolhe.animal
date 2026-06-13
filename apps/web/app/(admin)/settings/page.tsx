import { eq } from 'drizzle-orm';
import { getTranslations } from 'next-intl/server';

import { city, db } from '@acolhe-animal/db';
import { formatCnpj, formatCpf } from '@acolhe-animal/shared';
import { getOrganizationById } from '@acolhe-animal/domain';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { requireCtx } from '@/lib/auth-context';

export const dynamic = 'force-dynamic';

export default async function ConfigPage() {
  const ctx = await requireCtx();
  const t = await getTranslations('settings');
  const org = await getOrganizationById(db, ctx.organizationId);
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

  const financeStatusKey = `finance.status.${org.asaasOnboardingStatus}` as const;

  return (
    <div className="mx-auto max-w-3xl px-6 py-8 sm:px-10">
      <p className="eyebrow mb-2">— {t('eyebrow')}</p>
      <h1 className="display text-4xl text-ink">{t('title')}</h1>

      <div className="mt-8 grid gap-5">
        <Card>
          <CardHeader>
            <CardTitle>{t('orgCard.title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label={t('orgCard.name')} value={org.name} />
            <Row label={t('orgCard.publicAddress')} value={`acolhe.animal/${org.slug}`} mono />
            <Row
              label={org.documentType === 'cnpj' ? t('orgCard.cnpj') : t('orgCard.cpf')}
              value={
                org.documentType === 'cnpj' ? formatCnpj(org.document) : formatCpf(org.document)
              }
            />
            {cityRow && <Row label={t('orgCard.city')} value={`${cityRow.name}, ${cityRow.uf}`} />}
            <Row label={t('orgCard.phone')} value={org.phone} />
          </CardContent>
        </Card>

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

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-ink-mute">{label}</span>
      <span className={mono ? 'font-mono text-xs text-ink' : 'text-ink'}>{value}</span>
    </div>
  );
}
