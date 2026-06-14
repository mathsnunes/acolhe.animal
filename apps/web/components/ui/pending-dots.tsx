import { cn } from '@/lib/utils';

/**
 * Three pulsing dots — the Acolhe.animal loading indicator (design-system.md:
 * "bolinhas pulsantes em --terra, não spinner genérico"). Inherits `currentColor`
 * so it reads correctly on a terra button (paper) or on a light surface (set
 * `text-terra`).
 */
export const PendingDots = ({ className }: { className?: string }) => <span
      className={cn('inline-flex items-center gap-1', className)}
      role="status"
      aria-label="Carregando"
    >
      <span className="size-1.5 rounded-full bg-current animate-pulse-dot" />
      <span className="size-1.5 rounded-full bg-current animate-pulse-dot [animation-delay:200ms]" />
      <span className="size-1.5 rounded-full bg-current animate-pulse-dot [animation-delay:400ms]" />
    </span>;
