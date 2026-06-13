import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * Editorial page headers that live inside the content (listing + create screens),
 * where the product breathes. See `04-componentes-navegacao.md` › Cabeçalho de página.
 */

/** Variant 1 — listing with an optional big metric on the right. */
export function PageHeaderHero({
  title,
  description,
  metric,
  actions,
}: {
  title: string;
  description?: ReactNode;
  metric?: { value: ReactNode; label: string };
  actions?: ReactNode;
}) {
  return (
    <header className="px-6 pb-8 pt-7 sm:grid sm:grid-cols-[1fr_auto] sm:items-start sm:gap-12 sm:px-10 sm:pb-11">
      {/* Metric: a compact "12 ativos" line above the title on mobile; top-right on
          desktop (DOM-first + `order` keeps both layouts from one node). The number
          is terra, the label muted (ink-mute), no leading dash. */}
      {metric && (
        <div className="mb-3 flex items-baseline gap-2 sm:order-2 sm:mb-0">
          <span className="display text-3xl leading-none text-terra">{metric.value}</span>
          <span className="eyebrow eyebrow-mute">{metric.label}</span>
        </div>
      )}
      <div className="sm:order-1">
        <h1 className="display mb-4 text-[32px] leading-none text-ink sm:text-[40px]">{title}</h1>
        {description && (
          <p className="max-w-lg text-sm leading-relaxed text-ink-soft">{description}</p>
        )}
        {actions && <div className="mt-5 flex flex-wrap gap-3">{actions}</div>}
      </div>
    </header>
  );
}

/** Variant 2 — create/form screen: narrow, centered, with a back link. */
export function PageHeaderForm({
  backHref,
  backLabel,
  eyebrow,
  title,
  description,
}: {
  backHref: string;
  backLabel: string;
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
}) {
  return (
    <header className="mx-auto max-w-[680px] px-6 pb-6 pt-8 text-center">
      <Link
        href={backHref}
        className="mb-6 inline-flex items-center gap-1.5 text-[13px] text-terra hover:underline"
      >
        <ArrowLeft className="size-4" /> {backLabel}
      </Link>
      <p className="eyebrow mb-2">— {eyebrow}</p>
      <h1 className="display text-[40px] text-ink">{title}</h1>
      {description && <p className="mx-auto mt-3 max-w-md text-sm text-ink-soft">{description}</p>}
    </header>
  );
}

/** Variant 3 — detail breadcrumb (eyebrow + name live in the page top). */
export function DetailBreadcrumb({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-[13px] text-ink-mute hover:text-ink"
    >
      <ArrowLeft className="size-4" /> {label}
    </Link>
  );
}
