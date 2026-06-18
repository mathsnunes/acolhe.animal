import { Label } from '@/components/ui/label';

/**
 * Label row (label + optional right-aligned hint) wrapping a field control, with
 * an optional inline error. Shared by the auth field components so spacing and
 * hint/error styling stay consistent.
 */
export const Field = ({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: React.ReactNode;
  htmlFor?: string;
  hint?: React.ReactNode;
  error?: string;
  children: React.ReactNode;
}) => (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between gap-3">
      <Label htmlFor={htmlFor} className="text-[13px]">
        {label}
      </Label>
      {hint ? <span className="text-[11px] leading-none text-ink-mute">{hint}</span> : null}
    </div>
    {children}
    {error ? <p className="text-[12px] text-rose">{error}</p> : null}
  </div>
);
