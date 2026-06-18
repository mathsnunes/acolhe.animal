import { getTranslations } from 'next-intl/server';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Props {
  children: React.ReactNode;
}

const FinanceLayout = async ({ children }: Props) => {
  const t = await getTranslations('finance');
  return (
    <div>
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
