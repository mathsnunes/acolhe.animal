import { Check } from 'lucide-react';

import { cn } from '@/lib/utils';

type StepKey = 'data' | 'verify' | 'docs' | 'review' | 'done';

interface Props {
  activeStep: StepKey;
}

const STEPS: { key: StepKey; label: string }[] = [
  { key: 'data',   label: 'Dados' },
  { key: 'verify', label: 'Verificação' },
  { key: 'docs',   label: 'Documentos' },
  { key: 'review', label: 'Análise' },
  { key: 'done',   label: 'Pronto' },
];

const ORDER = STEPS.map((s) => s.key);

export const FinanceStepper = ({ activeStep }: Props) => {
  const activeIdx = ORDER.indexOf(activeStep);

  return (
    <nav className="mb-8 flex items-start">
      {STEPS.map(({ key, label }, i) => {
        const complete = i < activeIdx;
        const current  = i === activeIdx;
        return (
          <div key={key} className="relative flex flex-1 flex-col items-center">
            {i > 0 && (
              <span
                className={cn(
                  'absolute right-1/2 top-4 h-0.5 w-full -translate-y-1/2',
                  i <= activeIdx ? 'bg-green' : 'bg-line',
                )}
                aria-hidden
              />
            )}
            <div className="relative z-10 flex flex-col items-center gap-2">
              <span
                className={cn(
                  'flex size-8 items-center justify-center rounded-full border text-xs font-semibold transition',
                  current  && 'border-terra bg-terra text-paper',
                  complete && 'border-green bg-green text-paper',
                  !current && !complete && 'border-line bg-bg text-ink-mute',
                )}
              >
                {complete ? <Check className="size-4" /> : i + 1}
              </span>
              <span className={cn('text-center text-xs', current ? 'font-medium text-ink' : 'text-ink-mute')}>
                {label}
              </span>
            </div>
          </div>
        );
      })}
    </nav>
  );
};
