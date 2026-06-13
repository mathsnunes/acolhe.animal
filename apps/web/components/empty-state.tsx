import Link from 'next/link';
import type { ReactNode } from 'react';

/** Calm empty state with an optional CTA. Used across not-yet-active areas. */
export function EmptyState({
  eyebrow,
  title,
  description,
  actionHref,
  actionLabel,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  actionHref?: string;
  actionLabel?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 py-24 text-center">
      {eyebrow && <p className="eyebrow mb-3">— {eyebrow}</p>}
      <h2 className="display text-3xl text-ink">{title}</h2>
      {description && <p className="mt-3 text-sm text-ink-soft">{description}</p>}
      {actionHref && actionLabel && (
        <Link
          href={actionHref}
          className="mt-6 rounded-full bg-terra px-6 py-3 text-sm font-medium text-paper transition hover:brightness-95"
        >
          {actionLabel}
        </Link>
      )}
      {children}
    </div>
  );
}
