import { ForbiddenError } from '@acolhe-animal/shared';

import type { Actor, Ctx } from '../context';

/**
 * Authorization rules, as pure predicates + assertions.
 *
 * Roles (`modelagem-dados.md` › OrganizationMember):
 *  - admin     → everything
 *  - volunteer → animals + candidates; NOT finance, org identity, or members
 *
 * Assertions throw `ForbiddenError`; the web layer maps that to a 403/result.
 */
export const isUser = (actor: Actor): actor is Extract<Actor, { type: 'user' }> => actor.type === 'user';

export const isAdmin = (actor: Actor): boolean => actor.type === 'user' && actor.role === 'admin';

/** Animals & candidates: any authenticated member (admin or volunteer). */
export const canManageAnimals = (actor: Actor): boolean => isUser(actor);

/** Finance, org identity, members: admin only. */
export const canManageFinance = (actor: Actor): boolean => isAdmin(actor);
export const canManageMembers = canManageFinance;
export const canEditOrganization = canManageFinance;

export const assertCanManageAnimals = (ctx: Ctx): void => {
  if (!canManageAnimals(ctx.actor)) {
    throw new ForbiddenError('Você precisa estar logado para gerenciar animais.');
  }
};

export const assertAdmin = (ctx: Ctx): void => {
  if (!isAdmin(ctx.actor)) {
    throw new ForbiddenError('Apenas administradores da organização podem fazer isso.');
  }
};
