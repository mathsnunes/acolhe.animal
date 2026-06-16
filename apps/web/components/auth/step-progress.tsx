'use client';

import { cn } from '@/lib/utils';

/**
 * The 1-2-3 step indicator at the top of the signup wizard. `current` is the
 * active step index (0-based); earlier steps render as done (check).
 */
export const StepProgress = ({ steps, current }: { steps: string[]; current: number }) => (
  <div className="mb-7 flex items-center gap-2 text-xs text-ink-mute">
    {steps.map((label, i) => {
      const done = i < current;
      const active = i === current;
      return (
        <div key={label} className="flex items-center gap-2">
          <span
            className={cn(
              'flex size-6 shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-medium transition-colors',
              done ? 'bg-green text-paper' : active ? 'bg-terra text-paper' : 'bg-bg-2 text-ink-mute',
            )}
          >
            {done ? '✓' : i + 1}
          </span>
          <span className={cn('whitespace-nowrap text-[12px] font-medium', active ? 'text-ink' : 'hidden sm:inline')}>
            {label}
          </span>
          {i < steps.length - 1 ? <span className="h-px w-3 bg-line-soft sm:w-6" /> : null}
        </div>
      );
    })}
  </div>
);
