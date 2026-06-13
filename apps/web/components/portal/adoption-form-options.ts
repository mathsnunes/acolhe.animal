import type { Option } from './form-controls';

/** Static option sets for the adoption form, mirroring the prototype copy. */

/** A translator for the `form` namespace (e.g. from `useTranslations('form')`). */
type Translator = (key: string) => string;

export function housingOptions(t: Translator): Option[] {
  return [
    { value: 'house-yard', label: t('options.housing.houseYard'), sub: t('options.housing.houseYardSub') },
    { value: 'house-no-yard', label: t('options.housing.houseNoYard'), sub: t('options.housing.houseNoYardSub') },
    { value: 'apartment', label: t('options.housing.apartment'), sub: t('options.housing.apartmentSub') },
    { value: 'rural', label: t('options.housing.rural'), sub: t('options.housing.ruralSub') },
  ];
}

export function ownershipOptions(t: Translator): Option[] {
  return [
    { value: 'own', label: t('options.ownership.own') },
    { value: 'rent', label: t('options.ownership.rent') },
    { value: 'family', label: t('options.ownership.family') },
    { value: 'other', label: t('options.ownership.other') },
  ];
}

export function householdOptions(t: Translator): Option[] {
  return [
    { value: 'partner', label: t('options.household.partner') },
    { value: 'kids-small', label: t('options.household.kidsSmall') },
    { value: 'kids', label: t('options.household.kids') },
    { value: 'teens', label: t('options.household.teens') },
    { value: 'elderly', label: t('options.household.elderly') },
    { value: 'alone', label: t('options.household.alone') },
  ];
}

export function agreementOptions(t: Translator): Option[] {
  return [
    { value: 'yes', label: t('options.agreement.yes') },
    { value: 'talking', label: t('options.agreement.talking') },
  ];
}

export function hasPetsOptions(t: Translator): Option[] {
  return [
    { value: 'yes', label: t('options.hasPets.yes') },
    { value: 'no', label: t('options.hasPets.no') },
  ];
}

export function hadPetsOptions(t: Translator): Option[] {
  return [
    { value: 'yes', label: t('options.hadPets.yes') },
    { value: 'no', label: t('options.hadPets.no') },
  ];
}

export function hoursAwayOptions(t: Translator): Option[] {
  return [
    { value: 'lt4', label: t('options.hoursAway.lt4'), sub: t('options.hoursAway.lt4Sub') },
    { value: '4to8', label: t('options.hoursAway.h4to8'), sub: t('options.hoursAway.h4to8Sub') },
    { value: '8to12', label: t('options.hoursAway.h8to12'), sub: t('options.hoursAway.h8to12Sub') },
    { value: 'gt12', label: t('options.hoursAway.gt12'), sub: t('options.hoursAway.gt12Sub') },
  ];
}

export function sleepOptions(t: Translator): Option[] {
  return [
    { value: 'my-bed', label: t('options.sleep.myBed') },
    { value: 'bed-room', label: t('options.sleep.bedRoom') },
    { value: 'bed-living', label: t('options.sleep.bedLiving') },
    { value: 'outdoor', label: t('options.sleep.outdoor') },
  ];
}

export function vetOptions(t: Translator): Option[] {
  return [
    { value: 'easy', label: t('options.vet.easy') },
    { value: 'planned', label: t('options.vet.planned') },
    { value: 'tight', label: t('options.vet.tight') },
    { value: 'insurance', label: t('options.vet.insurance') },
  ];
}

/** Labels for the review step, keyed by stored answer value. */
export function valueLabels(t: Translator): Record<string, string> {
  return Object.fromEntries(
    [
      ...housingOptions(t),
      ...ownershipOptions(t),
      ...householdOptions(t),
      ...agreementOptions(t),
      ...hasPetsOptions(t),
      ...hadPetsOptions(t),
      ...hoursAwayOptions(t),
      ...sleepOptions(t),
      ...vetOptions(t),
    ].map((o) => [o.value, o.label]),
  );
}
