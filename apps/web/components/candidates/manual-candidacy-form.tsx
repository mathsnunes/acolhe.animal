'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ChevronLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { normalizePhoneBR } from '@acolhe-animal/shared';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CityCombobox } from '@/components/auth/city-combobox';
import { RadioCards, CheckList } from '@/components/portal/form-controls';
import {
  agreementOptions,
  hadPetsOptions,
  hasPetsOptions,
  hoursAwayOptions,
  householdOptions,
  housingOptions,
  ownershipOptions,
  sleepOptions,
  vetOptions,
} from '@/components/portal/adoption-form-options';
import { cn } from '@/lib/utils';
import { maskCep, maskCpf, maskPhoneBR } from '@/lib/masks';
import {
  saveManualDraftAction,
  submitManualCandidacyAction,
} from '@/app/(admin)/candidates/actions';

export interface CandidacyAnimal {
  id: string;
  name: string;
}

type Values = {
  animalId: string;
  name: string;
  phone: string;
  email: string;
  cpf: string;
  cityId: string | null;
  cityText: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  postalCode: string;
  housing: string;
  ownership: string;
  household: string[];
  agreement: string;
  hasPets: string;
  currentPets: string;
  hadPets: string;
  petHistory: string;
  hoursAway: string;
  travel: string;
  sleep: string;
  vet: string;
  motivation: string;
  questions: string;
};

export type ManualCandidacyInitial = Partial<Values>;

const EMPTY: Values = {
  animalId: '',
  name: '',
  phone: '',
  email: '',
  cpf: '',
  cityId: null,
  cityText: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  postalCode: '',
  housing: '',
  ownership: '',
  household: [],
  agreement: '',
  hasPets: '',
  currentPets: '',
  hadPets: '',
  petHistory: '',
  hoursAway: '',
  travel: '',
  sleep: '',
  vet: '',
  motivation: '',
  questions: '',
};

const isCpf = (s: string) => s.replace(/\D/g, '').length === 11;
const isEmail = (s: string) => /^\S+@\S+\.\S+$/.test(s.trim());

const buildPerson = (v: Values, e164: string) => ({
  name: v.name.trim(),
  phone: e164,
  // Only send optionals when valid, so a partial entry never blocks the autosave.
  email: isEmail(v.email) ? v.email.trim() : undefined,
  cpf: isCpf(v.cpf) ? v.cpf.replace(/\D/g, '') : undefined,
  cityId: v.cityId ?? undefined,
  streetAddress: v.street.trim() || undefined,
  addressNumber: v.number.trim() || undefined,
  addressComplement: v.complement.trim() || undefined,
  addressNeighborhood: v.neighborhood.trim() || undefined,
  postalCode: v.postalCode.trim() || undefined,
});

const buildApplicationData = (v: Values): Record<string, unknown> => {
  const data: Record<string, unknown> = {};
  const put = (k: string, val: unknown) => {
    if (val == null) return;
    if (typeof val === 'string' && !val.trim()) return;
    if (Array.isArray(val) && val.length === 0) return;
    data[k] = typeof val === 'string' ? val.trim() : val;
  };
  put('email', isEmail(v.email) ? v.email : '');
  put('city', v.cityText);
  put('address', [v.street, v.number, v.complement, v.neighborhood].map((s) => s.trim()).filter(Boolean).join(', '));
  put('housing', v.housing);
  put('ownership', v.ownership);
  put('household', v.household);
  put('agreement', v.agreement);
  put('hasPets', v.hasPets);
  if (v.hasPets === 'yes') put('currentPets', v.currentPets);
  put('hadPets', v.hadPets);
  if (v.hadPets === 'yes') put('petHistory', v.petHistory);
  put('hoursAway', v.hoursAway);
  put('travel', v.travel);
  put('sleep', v.sleep);
  put('vet', v.vet);
  put('motivation', v.motivation);
  put('questions', v.questions);
  return data;
};

/**
 * Full-page manual candidacy (presential / fair). Mirrors the public form's
 * questions and autosaves to a draft (like the animal wizard): a draft is created
 * once animal + name + a valid phone are present, every change autosaves it, and
 * "Criar candidatura" finalizes it into the funnel as "em avaliação". Drafts stay
 * out of the funnel until finalized. Resumes from `?rascunho=<id>` on reload.
 */
export const ManualCandidacyForm = ({
  animals,
  draftId,
  initial,
}: {
  animals: CandidacyAnimal[];
  draftId?: string;
  initial?: ManualCandidacyInitial;
}) => {
  const router = useRouter();
  const t = useTranslations('candidates');
  const tf = useTranslations('form');
  const [values, setValues] = useState<Values>({ ...EMPTY, ...initial });
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [isSubmitting, startSubmit] = useTransition();

  const idRef = useRef<string | null>(draftId ?? null);
  const skipNextSave = useRef(true);
  const valuesRef = useRef(values);
  valuesRef.current = values;

  const set = useCallback(<K extends keyof Values>(key: K, value: Values[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const animalName = animals.find((a) => a.id === values.animalId)?.name ?? tf('routine.theAnimalFallback');

  // ── Autosave (debounced) ──────────────────────────────────────────────────
  const persist = useCallback(async (v: Values): Promise<string | null> => {
    const e164 = normalizePhoneBR(v.phone);
    if (!v.animalId || !v.name.trim() || !e164) return idRef.current; // too little to save
    setSaveStatus('saving');
    try {
      const res = await saveManualDraftAction({
        applicationId: idRef.current ?? undefined,
        animalId: v.animalId,
        person: buildPerson(v, e164),
        applicationData: buildApplicationData(v),
      });
      if (res.ok) {
        const created = !idRef.current;
        idRef.current = res.data.id;
        if (created) {
          window.history.replaceState(null, '', `/candidatos/nova?rascunho=${res.data.id}`);
        }
      }
    } finally {
      setSaveStatus('saved');
    }
    return idRef.current;
  }, []);

  useEffect(() => {
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    const timer = setTimeout(() => void persist(valuesRef.current), 800);
    return () => clearTimeout(timer);
  }, [values, persist]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!values.animalId) return toast.error(t('manual.chooseAnimal'));
    if (!values.name.trim()) return toast.error(t('manual.nameRequired'));
    if (!normalizePhoneBR(values.phone)) return toast.error(t('manual.phoneInvalid'));
    if (values.cpf && !isCpf(values.cpf)) return toast.error(t('manual.cpfInvalid'));

    startSubmit(async () => {
      const id = await persist(valuesRef.current);
      if (!id) {
        toast.error(t('manual.chooseAnimal'));
        return;
      }
      const res = await submitManualCandidacyAction(id);
      if (res.ok) {
        toast.success(t('manual.created'));
        router.push(`/candidatos/${res.data.id}`);
        router.refresh();
      } else {
        toast.error(res.error.message);
      }
    });
  };

  return (
    <div className="mx-auto max-w-2xl px-6 pb-24">
      <button
        type="button"
        onClick={() => router.push('/candidatos')}
        className="mb-6 inline-flex items-center gap-2 text-sm text-ink-mute transition hover:text-ink"
      >
        <ChevronLeft className="size-4" />
        {t('manual.back')}
      </button>

      <div className="mb-8">
        <p className="eyebrow">— {t('manual.eyebrow')}</p>
        <h1 className="display mt-2 text-[32px] text-ink sm:text-[40px]">{t('manual.title')}</h1>
        <p className="mt-3 max-w-xl text-ink-soft">{t('manual.description')}</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-8">
        <Section title={t('manual.animalSection')}>
          <div className="space-y-2">
            <Label>{t('manual.animalLabel')}</Label>
            <Select value={values.animalId} onValueChange={(v) => set('animalId', v)} disabled={animals.length === 0}>
              <SelectTrigger>
                <SelectValue
                  placeholder={animals.length === 0 ? t('manual.animalEmpty') : t('manual.animalPlaceholder')}
                />
              </SelectTrigger>
              <SelectContent>
                {animals.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Section>

        <Section title={t('manual.whoSection')}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="mc-name">{t('manual.nameLabel')}</Label>
              <Input id="mc-name" value={values.name} onChange={(e) => set('name', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mc-phone">{t('manual.phoneLabel')}</Label>
              <Input id="mc-phone" inputMode="tel" placeholder="(48) 99999-0000" value={values.phone} onChange={(e) => set('phone', maskPhoneBR(e.target.value))} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mc-email">{t('manual.emailLabel')}</Label>
              <Input id="mc-email" type="email" value={values.email} onChange={(e) => set('email', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mc-cpf">{t('manual.cpfLabel')}</Label>
              <Input id="mc-cpf" inputMode="numeric" placeholder="000.000.000-00" value={values.cpf} onChange={(e) => set('cpf', maskCpf(e.target.value))} />
            </div>
          </div>
          <CityCombobox
            label={t('manual.cityLabel')}
            placeholder={t('manual.cityPlaceholder')}
            emptyLabel={t('manual.cityEmpty')}
            initialText={initial?.cityText ?? ''}
            onChange={(c) => {
              set('cityId', c?.id ?? null);
              set('cityText', c ? `${c.name}, ${c.stateCode}` : '');
            }}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_7rem]">
            <div className="space-y-2">
              <Label htmlFor="mc-street">{t('manual.streetLabel')}</Label>
              <Input id="mc-street" value={values.street} onChange={(e) => set('street', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mc-number">{t('manual.numberLabel')}</Label>
              <Input id="mc-number" value={values.number} onChange={(e) => set('number', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="mc-complement">{t('manual.complementLabel')}</Label>
              <Input id="mc-complement" value={values.complement} onChange={(e) => set('complement', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mc-neighborhood">{t('manual.neighborhoodLabel')}</Label>
              <Input id="mc-neighborhood" value={values.neighborhood} onChange={(e) => set('neighborhood', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mc-cep">{t('manual.postalCodeLabel')}</Label>
              <Input id="mc-cep" inputMode="numeric" value={values.postalCode} onChange={(e) => set('postalCode', maskCep(e.target.value))} />
            </div>
          </div>
        </Section>

        <Section title={t('manual.housingSection')}>
          <QField label={tf('housing.housingLabel')}>
            <RadioCards name="housing" options={housingOptions(tf)} value={values.housing} onChange={(v) => set('housing', v)} />
          </QField>
          <QField label={tf('housing.ownershipLabel')}>
            <RadioCards name="ownership" options={ownershipOptions(tf)} value={values.ownership} onChange={(v) => set('ownership', v)} />
          </QField>
          <QField label={tf('housing.householdLabel')}>
            <CheckList options={householdOptions(tf)} values={values.household} onChange={(v) => set('household', v)} />
          </QField>
          <QField label={tf('housing.agreementLabel')}>
            <RadioCards name="agreement" options={agreementOptions(tf)} value={values.agreement} onChange={(v) => set('agreement', v)} />
          </QField>
        </Section>

        <Section title={t('manual.petsSection')}>
          <QField label={tf('pets.hasPetsLabel')}>
            <RadioCards name="hasPets" options={hasPetsOptions(tf)} value={values.hasPets} onChange={(v) => set('hasPets', v)} />
          </QField>
          {values.hasPets === 'yes' && (
            <QField label={tf('pets.currentPetsLabel')}>
              <Textarea rows={2} value={values.currentPets} onChange={(e) => set('currentPets', e.target.value)} />
            </QField>
          )}
          <QField label={tf('pets.hadPetsLabel')}>
            <RadioCards name="hadPets" options={hadPetsOptions(tf)} value={values.hadPets} onChange={(v) => set('hadPets', v)} />
          </QField>
          {values.hadPets === 'yes' && (
            <QField label={tf('pets.petHistoryLabel')}>
              <Textarea rows={2} value={values.petHistory} onChange={(e) => set('petHistory', e.target.value)} />
            </QField>
          )}
        </Section>

        <Section title={t('manual.routineSection')}>
          <QField label={tf('routine.hoursAwayLabel')}>
            <RadioCards name="hoursAway" options={hoursAwayOptions(tf)} value={values.hoursAway} onChange={(v) => set('hoursAway', v)} />
          </QField>
          <QField label={tf('routine.travelLabel')}>
            <Textarea rows={2} value={values.travel} onChange={(e) => set('travel', e.target.value)} />
          </QField>
          <QField label={tf('routine.sleepLabel', { animalName })}>
            <RadioCards name="sleep" options={sleepOptions(tf)} value={values.sleep} onChange={(v) => set('sleep', v)} />
          </QField>
          <QField label={tf('routine.vetLabel')}>
            <RadioCards name="vet" options={vetOptions(tf)} value={values.vet} onChange={(v) => set('vet', v)} />
          </QField>
        </Section>

        <Section title={t('manual.motivationSection')}>
          <QField label={tf('review.motivationLabel', { animalName })}>
            <Textarea rows={3} value={values.motivation} onChange={(e) => set('motivation', e.target.value)} />
          </QField>
          <QField label={tf('review.questionsLabel')}>
            <Textarea rows={2} value={values.questions} onChange={(e) => set('questions', e.target.value)} />
          </QField>
        </Section>

        <div className="flex flex-col gap-4 border-t border-line-soft pt-5 sm:flex-row sm:items-center sm:justify-between">
          <span className={cn('inline-flex items-center gap-2 text-xs text-ink-mute', saveStatus === 'saving' && 'text-terra')}>
            <span className={cn('size-1.5 rounded-full', saveStatus === 'saving' ? 'bg-terra' : 'bg-green')} />
            {saveStatus === 'saving' ? t('manual.saving') : t('manual.saved')}
          </span>
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" asChild>
              <Link href="/candidatos">{t('manual.cancel')}</Link>
            </Button>
            <Button type="submit" pending={isSubmitting}>
              {t('manual.submit')}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="rounded-2xl border border-line-soft bg-paper p-6 shadow-card sm:p-7">
    <h2 className="eyebrow mb-5">— {title}</h2>
    <div className="space-y-5">{children}</div>
  </section>
);

const QField = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="space-y-2.5">
    <p className="text-sm font-medium text-ink">{label}</p>
    {children}
  </div>
);
