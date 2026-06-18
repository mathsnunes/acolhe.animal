import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

type StepStatus = 'done' | 'current' | 'upcoming';

interface Step {
  label: string;
  status: StepStatus;
}

interface FinanceStepperProps {
  activeStep: 'data' | 'verify' | 'docs' | 'review' | 'done';
}

const STEPS = [
  { key: 'data', label: 'Dados' },
  { key: 'verify', label: 'Verificação' },
  { key: 'docs', label: 'Documentos' },
  { key: 'review', label: 'Análise' },
  { key: 'done', label: 'Pronto' },
] as const;

const ORDER = STEPS.map((s) => s.key);

export const FinanceStepper = ({ activeStep }: FinanceStepperProps) => {
  const activeIdx = ORDER.indexOf(activeStep);
  const steps: Step[] = STEPS.map((s, i) => ({
    label: s.label,
    status: i < activeIdx ? 'done' : i === activeIdx ? 'current' : 'upcoming',
  }));

  return (
    <div className="mb-8 flex items-center">
      {steps.map((step, i) => (
        <div key={step.label} className="flex items-center">
          <div
            className={cn('flex items-center gap-2 text-[12.5px]', {
              'text-ink-mute': step.status === 'upcoming',
              'font-medium text-terra': step.status === 'current',
              'text-ink-soft': step.status === 'done',
            })}
          >
            <span
              className={cn(
                'flex size-6 items-center justify-center rounded-full border text-[11px] font-medium',
                {
                  'border-line bg-paper': step.status === 'upcoming',
                  'border-terra bg-terra text-white': step.status === 'current',
                  'border-green-soft bg-green-soft text-white': step.status === 'done',
                },
              )}
            >
              {step.status === 'done' ? <Check className="size-3" /> : i + 1}
            </span>
            <span className="hidden sm:inline">{step.label}</span>
          </div>
          {i < steps.length - 1 && <div className="mx-3 h-px min-w-[18px] flex-1 bg-line" />}
        </div>
      ))}
    </div>
  );
};
