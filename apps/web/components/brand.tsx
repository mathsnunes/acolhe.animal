import { cn } from '@/lib/utils';

/** The Acolhe.animal wordmark: the terra dot is the only brand accent color. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn('brand-mark text-lg text-ink', className)}>
      Acolhe<span className="brand-dot">.</span>animal
    </span>
  );
}
