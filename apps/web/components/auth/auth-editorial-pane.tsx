import { getTranslations } from 'next-intl/server';

import { BrandMark } from '@/components/brand';
import { cn } from '@/lib/utils';

/**
 * The dark editorial pane on the left of the auth screens. Static marketing copy
 * (from i18n); the form lives in the sibling pane. Hidden below `lg` — on mobile
 * the form pane shows a compact wordmark instead.
 */
export const AuthEditorialPane = async ({ className }: { className?: string }) => {
  const t = await getTranslations('auth.editorial');

  return (
    <aside
      className={cn(
        'relative flex-col justify-between overflow-hidden bg-ink px-[clamp(2rem,5vw,4.5rem)] py-14 text-paper',
        className,
      )}
    >
      {/* Subtle grain: two faint radial washes in brand colors. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 30%, rgba(184,92,60,0.10) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(200,160,74,0.06) 0%, transparent 50%)',
        }}
      />

      <header className="relative z-10">
        <BrandMark className="text-[2rem] text-paper" />
      </header>

      <div className="relative z-10 mt-20 max-w-[30rem]">
        <h1 className="display text-[clamp(2.25rem,4vw,3.5rem)] font-light leading-[1.02] tracking-[-0.025em] text-paper">
          {t('titleLine1')}
          <br />
          {t.rich('titleLine2', { em: (c) => <em className="font-normal italic text-gold">{c}</em> })}
        </h1>
        <p className="mt-7 max-w-[26rem] text-base leading-relaxed text-paper/70">{t('body')}</p>
      </div>

      <footer className="relative z-10">
        <ul className="space-y-1 border-t border-paper/10 pt-6">
          {(['f1', 'f2', 'f3'] as const).map((k) => (
            <li key={k} className="flex items-baseline gap-3.5 py-2 text-sm text-paper/70">
              <span aria-hidden className="mt-1.5 h-px w-4 shrink-0 bg-terra" />
              {t(`features.${k}`)}
            </li>
          ))}
        </ul>
      </footer>
    </aside>
  );
};
