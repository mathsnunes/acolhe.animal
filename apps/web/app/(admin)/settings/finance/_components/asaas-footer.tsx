import { Lock } from 'lucide-react';
import { useTranslations } from 'next-intl';

export const AsaasFooter = () => {
  const t = useTranslations('finance');
  return (
    <div className="mt-6 flex items-center gap-2 text-[11.5px] text-ink-mute">
      <Lock className="size-3 shrink-0" />
      <span>
        {t('asaasFooter')}{' '}
        <a
          href="https://www.asaas.com"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2"
        >
          {t('asaasLearnMore')}
        </a>
      </span>
    </div>
  );
};
