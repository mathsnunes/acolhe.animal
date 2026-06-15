import { useTranslations } from 'next-intl';

import type { JsonRecord } from '@acolhe-animal/db';

import { valueLabels } from '@/components/portal/adoption-form-options';

/**
 * The candidate's form answers rendered as curated, themed section cards (instead
 * of a flat key→value list). The 6-step public form writes a stable set of keys;
 * here we group the meaningful ones and resolve their labels from the `form` i18n
 * namespace + the form's option labels. Empty answers and empty sections are
 * dropped; any key not in the map surfaces under "Outras respostas" so nothing is
 * lost when the form evolves.
 */

type FieldKind = 'text' | 'quote' | 'choice' | 'choices';
interface FieldDef {
  key: string;
  /** Key under the `form` i18n namespace. */
  labelKey: string;
  kind: FieldKind;
}
interface SectionDef {
  id: string;
  /** Keys under `candidates.detail.sections.*`. */
  eyebrowKey: string;
  titleKey: string;
  fields: FieldDef[];
}

const SECTIONS: SectionDef[] = [
  {
    id: 'why',
    eyebrowKey: 'whyEyebrow',
    titleKey: 'whyTitle',
    fields: [
      { key: 'motivation', labelKey: 'review.motivationLabel', kind: 'quote' },
      { key: 'questions', labelKey: 'review.questionsLabel', kind: 'text' },
    ],
  },
  {
    id: 'home',
    eyebrowKey: 'homeEyebrow',
    titleKey: 'homeTitle',
    fields: [
      { key: 'housing', labelKey: 'housing.housingLabel', kind: 'choice' },
      { key: 'ownership', labelKey: 'housing.ownershipLabel', kind: 'choice' },
      { key: 'household', labelKey: 'housing.householdLabel', kind: 'choices' },
      { key: 'agreement', labelKey: 'housing.agreementLabel', kind: 'choice' },
      { key: 'hoursAway', labelKey: 'routine.hoursAwayLabel', kind: 'choice' },
      { key: 'travel', labelKey: 'routine.travelLabel', kind: 'text' },
      { key: 'sleep', labelKey: 'routine.sleepLabel', kind: 'choice' },
      { key: 'vet', labelKey: 'routine.vetLabel', kind: 'choice' },
    ],
  },
  {
    id: 'experience',
    eyebrowKey: 'experienceEyebrow',
    titleKey: 'experienceTitle',
    fields: [
      { key: 'hasPets', labelKey: 'pets.hasPetsLabel', kind: 'choice' },
      { key: 'currentPets', labelKey: 'pets.currentPetsLabel', kind: 'text' },
      { key: 'hadPets', labelKey: 'pets.hadPetsLabel', kind: 'choice' },
      { key: 'petHistory', labelKey: 'pets.petHistoryLabel', kind: 'text' },
    ],
  },
];

/**
 * Keys shown elsewhere (the page header + the bespoke "Quem é" card) or covered by
 * a section here — excluded from the "Outras respostas" fallback.
 */
const HANDLED_KEYS = new Set<string>([
  'name',
  'phone',
  'email',
  'city',
  'address',
  ...SECTIONS.flatMap((s) => s.fields.map((f) => f.key)),
]);

const humanize = (key: string): string => {
  const spaced = key
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
};

const isEmpty = (v: unknown): boolean =>
  v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0);

const SectionCard = ({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) => (
  <section className="section-card p-6 sm:p-7">
    <div className="mb-4">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="display mt-1.5 text-[22px] text-ink">{title}</h2>
    </div>
    <dl className="divide-y divide-line-soft">{children}</dl>
  </section>
);

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="py-3 first:pt-0 last:pb-0">
    <dt className="mb-1 text-[10.5px] font-medium uppercase tracking-wide text-ink-mute">{label}</dt>
    <dd className="text-[13.5px] leading-relaxed text-ink">{children}</dd>
  </div>
);

export const ApplicationSections = ({
  data,
  animalName,
}: {
  data: JsonRecord | null;
  animalName: string;
}) => {
  const t = useTranslations('candidates');
  const tForm = useTranslations('form');
  if (!data || Object.keys(data).length === 0) {
    return (
      <section className="section-card p-6 sm:p-7">
        <p className="text-sm text-ink-mute">{t('facts.empty')}</p>
      </section>
    );
  }

  const labels = valueLabels(tForm);
  const renderValue = (field: FieldDef, value: unknown): React.ReactNode => {
    switch (field.kind) {
      case 'choice':
        return labels[String(value)] ?? humanize(String(value));
      case 'choices':
        return (Array.isArray(value) ? value : [value])
          .map((v) => labels[String(v)] ?? humanize(String(v)))
          .join(' · ');
      case 'quote':
        return (
          <span className="display text-[15px] italic leading-relaxed text-ink-soft">
            “{String(value)}”
          </span>
        );
      default:
        return String(value);
    }
  };

  const extraKeys = Object.keys(data).filter((k) => !HANDLED_KEYS.has(k) && !isEmpty(data[k]));

  return (
    <>
      {SECTIONS.map((section) => {
        const present = section.fields.filter((f) => !isEmpty(data[f.key]));
        if (present.length === 0) return null;
        return (
          <SectionCard
            key={section.id}
            eyebrow={t(`detail.sections.${section.eyebrowKey}`)}
            title={t(`detail.sections.${section.titleKey}`)}
          >
            {present.map((field) => (
              <Row key={field.key} label={tForm(field.labelKey, { animalName })}>
                {renderValue(field, data[field.key])}
              </Row>
            ))}
          </SectionCard>
        );
      })}

      {extraKeys.length > 0 && (
        <SectionCard
          eyebrow={t('detail.sections.otherEyebrow')}
          title={t('detail.sections.otherTitle')}
        >
          {extraKeys.map((key) => (
            <Row key={key} label={humanize(key)}>
              {Array.isArray(data[key]) ? (data[key] as unknown[]).join(', ') : String(data[key])}
            </Row>
          ))}
        </SectionCard>
      )}
    </>
  );
};
