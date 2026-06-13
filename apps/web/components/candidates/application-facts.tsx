import { useTranslations } from 'next-intl';

import type { JsonRecord } from '@acolhe-animal/db';

/** Turn a snake/camelCase form key into a human label. */
function humanize(key: string): string {
  const spaced = key
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function renderValue(value: unknown, labels: { yes: string; no: string }): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? labels.yes : labels.no;
  if (Array.isArray(value)) return value.map((v) => renderValue(v, labels)).join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/**
 * Render the candidate's form answers (the application's jsonb payload) as a
 * readable list of labeled facts.
 */
export function ApplicationFacts({ data }: { data: JsonRecord | null }) {
  const t = useTranslations('candidates');
  const entries = data ? Object.entries(data) : [];
  const boolLabels = { yes: t('facts.yes'), no: t('facts.no') };

  if (entries.length === 0) {
    return <p className="text-sm text-ink-mute">{t('facts.empty')}</p>;
  }

  return (
    <dl className="divide-y divide-line-soft">
      {entries.map(([key, value]) => (
        <div key={key} className="py-3 first:pt-0 last:pb-0">
          <dt className="mb-1 text-[10.5px] font-medium uppercase tracking-wide text-ink-mute">
            {humanize(key)}
          </dt>
          <dd className="text-[13.5px] leading-relaxed text-ink">{renderValue(value, boolLabels)}</dd>
        </div>
      ))}
    </dl>
  );
}
