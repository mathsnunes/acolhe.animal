import { Check } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface StepperStep {
  label: string;
}

interface Props {
  steps: readonly StepperStep[] | StepperStep[];
  /** Zero-based index of the active step. */
  activeIndex: number;
  /** When provided, each step renders as a button and calls this with the zero-based index. */
  onStepClick?: (index: number) => void;
  /** Zero-based indices of steps that have validation errors (shown in rose). */
  errorIndices?: Set<number>;
  className?: string;
}

export const Stepper = ({ steps, activeIndex, onStepClick, errorIndices, className }: Props) => (
  <nav className={cn('flex items-start', className)} aria-label="Progresso">
    {steps.map(({ label }, i) => {
      const complete = i < activeIndex;
      const current  = i === activeIndex;
      const error    = errorIndices?.has(i) && !current && !complete;

      const dot = (
        <span
          className={cn(
            'flex size-8 items-center justify-center rounded-full border text-xs font-semibold transition',
            current  && 'border-terra bg-terra text-paper',
            complete && 'border-green bg-green text-paper',
            !current && !complete && !error && 'border-line bg-bg text-ink-mute',
            error && 'border-rose bg-bg text-rose',
          )}
        >
          {complete ? <Check className="size-4" /> : i + 1}
        </span>
      );

      const inner = (
        <>
          {dot}
          <span className={cn('text-center text-xs', current ? 'font-medium text-ink' : 'text-ink-mute')}>
            {label}
          </span>
        </>
      );

      return (
        <div key={label} className="relative flex flex-1 flex-col items-center">
          {i > 0 && (
            <span
              className={cn(
                'absolute right-1/2 top-4 h-0.5 w-full -translate-y-1/2',
                i <= activeIndex ? 'bg-green' : 'bg-line',
              )}
              aria-hidden
            />
          )}
          {onStepClick ? (
            <button
              type="button"
              onClick={() => onStepClick(i)}
              aria-current={current ? 'step' : undefined}
              className="relative z-10 flex flex-col items-center gap-2"
            >
              {inner}
            </button>
          ) : (
            <div className="relative z-10 flex flex-col items-center gap-2">{inner}</div>
          )}
        </div>
      );
    })}
  </nav>
);
