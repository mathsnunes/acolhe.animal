import { getTranslations } from 'next-intl/server';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Props {
  children: React.ReactNode;
}

const FinanceLayout = async ({ children }: Props) => {
  const t = await getTranslations('finance');
  return (
    <div className="mx-auto max-w-2xl py-6">
      <div className="mb-6">
        <div className="eyebrow-mute mb-1">— {t('layout.eyebrow')}</div>
        <h1 className="display text-3xl">{t('layout.title')}</h1>
      </div>
      <Tabs defaultValue="recebimento" className="mb-6">
        <TabsList>
          <TabsTrigger value="recebimento">{t('layout.tabReceiving')}</TabsTrigger>
          <TabsTrigger value="saque" disabled>{t('layout.tabPayout')}</TabsTrigger>
        </TabsList>
      </Tabs>
      {children}
    </div>
  );
};

export default FinanceLayout;
