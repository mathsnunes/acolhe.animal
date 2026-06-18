import { Info, Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { AsaasFooter } from '../_components/asaas-footer';

interface Props {
  pixKey: string | null;
}

export const NotStartedState = ({ pixKey }: Props) => {
  const t = useTranslations('finance');
  return (
    <div className="space-y-4">
      <div className="flex gap-3 rounded-[10px] bg-[#FBF3DF] p-4 text-[13.5px] text-[#7a5a1a]">
        <Info className="mt-0.5 size-[18px] shrink-0" />
        <span>{t('notStarted.modeBanner')}</span>
      </div>

      {pixKey && (
        <div className="card">
          <div className="eyebrow-mute mb-4">— Como você recebe hoje</div>
          <h2 className="display mb-3 text-xl">{t('notStarted.currentPixTitle')}</h2>
          <p className="mb-4 text-[15px] text-ink-soft">{t('notStarted.currentPixDesc')}</p>
          <div className="flex items-center gap-4 rounded-[10px] border border-line bg-bg p-4">
            <div className="flex-1">
              <div className="font-medium">{pixKey}</div>
              <div className="hint">Chave divulgada no seu portal</div>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="eyebrow-mute mb-4">— Recomendado</div>
        <h2 className="display mb-3 text-2xl">
          Ative o <em className="text-terra">recebimento gerenciado</em> e veja cada doação sozinha
        </h2>
        <p className="mb-4 text-[15px] text-ink-soft">{t('notStarted.featureDesc')}</p>
        <ul className="mb-6 space-y-3">
          {(['benefit1', 'benefit2', 'benefit3'] as const).map((key) => (
            <li key={key} className="flex items-start gap-3 text-[14.5px] text-ink-soft">
              <span className="mt-0.5 flex size-[22px] shrink-0 items-center justify-center rounded-full bg-terra-bg text-[12px] text-terra">
                <Check className="size-3" />
              </span>
              {t(`notStarted.${key}`)}
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild className="rounded-full px-7">
            <Link href="/config/financeiro?step=confirm">{t('notStarted.cta')}</Link>
          </Button>
          <span className="text-[13px] text-ink-mute">{t('notStarted.ctaHint')}</span>
        </div>
        <AsaasFooter />
      </div>
    </div>
  );
};
