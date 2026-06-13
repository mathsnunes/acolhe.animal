/** Shape of a next-intl translator scoped to a namespace (`useTranslations(ns)` /
 *  `getTranslations(ns)`). Shared so helpers that take a `t` don't each redeclare it. */
export type Translator = (key: string, values?: Record<string, string | number>) => string;
