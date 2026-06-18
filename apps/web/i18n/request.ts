import { getRequestConfig } from 'next-intl/server';

import common from '@/messages/pt/common.json';
import nav from '@/messages/pt/nav.json';
import home from '@/messages/pt/home.json';
import auth from '@/messages/pt/auth.json';
import members from '@/messages/pt/members.json';
import settings from '@/messages/pt/settings.json';
import emptyStates from '@/messages/pt/emptyStates.json';
import landing from '@/messages/pt/landing.json';
import animals from '@/messages/pt/animals.json';
import candidates from '@/messages/pt/candidates.json';
import adoptions from '@/messages/pt/adoptions.json';
import portal from '@/messages/pt/portal.json';
import form from '@/messages/pt/form.json';
import instagram from '@/messages/pt/instagram.json';
import finance from '@/messages/pt/finance.json';

/**
 * Single-locale i18n (pt-BR) without URL routing. All UI copy lives in the
 * `messages/pt/*` dictionaries, namespaced by feature, so the product can be
 * translated later without touching components. See `docs/conventions.md`.
 */
export const LOCALE = 'pt-BR';

export default getRequestConfig(async () => ({
  locale: LOCALE,
  messages: {
    common,
    nav,
    home,
    auth,
    members,
    settings,
    emptyStates,
    landing,
    animals,
    candidates,
    adoptions,
    portal,
    form,
    instagram,
    finance,
  },
}));
