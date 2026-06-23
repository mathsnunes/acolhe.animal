import { notFound } from 'next/navigation';

import { PortalHeader } from '@/components/portal/portal-header';
import { PortalFooter } from '@/components/portal/portal-footer';
import { DonationPixCard } from './_components/donation-pix-card';
import { getPublicOrganization, portalChrome } from '../data';

type PageProps = { params: Promise<{ slug: string }> };

export const generateMetadata = async ({ params }: PageProps) => {
  const { slug } = await params;
  const org = await getPublicOrganization(slug);
  if (!org) return {};
  return { title: `Apoie ${org.name}` };
};

export default async function ApoiarPage({ params }: PageProps) {
  const { slug } = await params;
  const org = await getPublicOrganization(slug);
  if (!org) notFound();
  if (!org.asaasPixKeyCached) notFound();

  const { accentStyle, documentLabel, hasAbout } = portalChrome(org);

  return (
    <div className="min-h-dvh bg-bg" style={accentStyle}>
      <PortalHeader slug={slug} orgName={org.name} logoUrl={org.logoUrl} showAbout={hasAbout} />

      <main className="mx-auto max-w-lg px-6 py-16">
        <p className="eyebrow mb-4 text-center">Apoie</p>
        <h1 className="display mb-3 text-center text-3xl">{org.name}</h1>
        <p className="mb-10 text-center text-[15px] text-ink-soft">
          Sua doação vai direto para a conta da organização via Pix.
        </p>

        <DonationPixCard pixKey={org.asaasPixKeyCached} orgName={org.name} />
      </main>

      <PortalFooter
        orgName={org.name}
        documentLabel={documentLabel}
        instagram={org.portalConfig?.instagram}
        showAbout={hasAbout}
      />
    </div>
  );
}
