import { and, asc, eq } from 'drizzle-orm';

import {
  createId,
  generateInstagramArtSchema,
  NotFoundError,
  ValidationError,
  type GenerateInstagramArtInput,
  type InstagramArtType,
} from '@acolhe-animal/shared';
import {
  animal,
  animalInstagramArt,
  animalPhoto,
  city,
  type Animal,
  type AnimalInstagramArt,
  type Organization,
} from '@acolhe-animal/db';
import { getStorage, renderInstagramArt } from '@acolhe-animal/integrations';
import { instagramContent, type InstagramContentParams } from '@acolhe-animal/messaging';

import type { Ctx } from '../context';
import { assertCanManageAnimals } from '../auth/permissions';
import { getAnimal } from '../animals/service';
import { getOrganizationByPk } from '../organizations/service';

/** Existing arts for an animal (at most one per type) — drives the modal's initial state. */
export const listInstagramArt = async (ctx: Ctx, animalId: string): Promise<AnimalInstagramArt[]> => {
  const a = await getAnimal(ctx, animalId); // tenant-scoped; throws if not ours
  return ctx.db
    .select()
    .from(animalInstagramArt)
    .where(eq(animalInstagramArt.animalId, a.pk))
    .orderBy(asc(animalInstagramArt.type));
};

/**
 * Generate (or regenerate) the Instagram art + caption for an animal in the
 * given format. Deterministic: composes the chosen photo + org brand into a PNG
 * and a templated pt-BR caption, stores both, and upserts the `(animal, type)`
 * row. Returns the stored art.
 */
export const generateInstagramArt = async (
  ctx: Ctx,
  input: GenerateInstagramArtInput,
): Promise<AnimalInstagramArt> => {
  assertCanManageAnimals(ctx);
  const { animalId, type, photoId } = generateInstagramArtSchema.parse(input);

  const a = await getAnimal(ctx, animalId);
  const org = await getOrganizationByPk(ctx.db, ctx.organizationId);
  if (!org) throw new NotFoundError('Organização não encontrada.');

  const [photo] = await ctx.db
    .select()
    .from(animalPhoto)
    .where(and(eq(animalPhoto.id, photoId), eq(animalPhoto.animalId, a.pk)))
    .limit(1);
  if (!photo) throw new ValidationError('Foto não encontrada para este animal.');

  const cityName = await orgCityName(ctx, org);
  const storage = getStorage();

  const photoBytes = await storage.get(storage.keyFromUrl(photo.mediumUrl));

  const content = instagramContent(type, buildContentParams(a, org, cityName));
  const png = await renderInstagramArt({
    type,
    photo: photoBytes,
    orgName: org.name,
    eyebrow: content.eyebrow,
    title: content.title,
    facts: content.facts,
  });

  const id = createId('animalInstagramArt');
  const key = `instagram-art/${a.id}/${type}.png`;
  await storage.put({ key, body: png.body, contentType: 'image/png' });
  const imageUrl = `${storage.getPublicUrl(key)}?v=${id}`;

  const [row] = await ctx.db
    .insert(animalInstagramArt)
    .values({ id, animalId: a.pk, type, imageUrl, caption: content.caption })
    .onConflictDoUpdate({
      target: [animalInstagramArt.animalId, animalInstagramArt.type],
      set: { imageUrl, caption: content.caption, generatedAt: new Date() },
    })
    .returning();
  return row!;
};

// ── pt-BR humanization (server-side content, like the term PDF) ──────────────

const SIZE_LABEL: Record<NonNullable<Animal['size']>, string> = {
  small: 'porte pequeno',
  medium: 'porte médio',
  large: 'porte grande',
};

const ageInMonths = (a: Animal): number | null => {
  if (a.estimatedBirthDate) {
    const birth = new Date(a.estimatedBirthDate);
    const now = new Date();
    const m = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
    return m >= 0 ? m : null;
  }
  if (a.ageMonthsAtIntake != null) {
    const elapsed = a.ageReferenceDate
      ? Math.max(0, Math.floor((Date.now() - new Date(a.ageReferenceDate).getTime()) / (1000 * 60 * 60 * 24 * 30.44)))
      : 0;
    return a.ageMonthsAtIntake + elapsed;
  }
  return null;
};

const ageLabel = (a: Animal): string | undefined => {
  const months = ageInMonths(a);
  if (months == null) return undefined;
  if (months < 12) return `~${months} ${months === 1 ? 'mês' : 'meses'}`;
  const years = Math.floor(months / 12);
  return `~${years} ${years === 1 ? 'ano' : 'anos'}`;
};

const buildContentParams = (a: Animal, org: Organization, cityName?: string): InstagramContentParams => {
  const female = a.sex === 'female';
  const adj = (base: string) => `${base}${female ? 'a' : 'o'}`; // castrad{a/o}, vacinad{a/o}

  const flags: string[] = [];
  if (a.neutered === 'yes') flags.push(adj('castrad'));
  if (a.vaccinations.length > 0) flags.push(adj('vacinad'));
  if (a.microchipCode) flags.push(adj('microchipad'));

  const temperament: string[] = [];
  if (a.goodWithChildren === 'yes') temperament.push(`${adj('ótim')} com crianças`);
  if (a.goodWithDogs === 'yes') temperament.push('se dá bem com outros cães');
  if (a.goodWithCats === 'yes') temperament.push('se dá bem com gatos');

  return {
    animalName: a.name,
    article: female ? 'a' : 'o',
    species: a.species, // 'dog' | 'cat'
    ageLabel: ageLabel(a),
    sizeLabel: a.size ? SIZE_LABEL[a.size] : undefined,
    weightLabel: a.weightKg ? `${Number(a.weightKg)}kg` : undefined,
    flags,
    temperament: temperament.slice(0, 2),
    shortStory: a.shortStory ?? undefined,
    orgName: org.name,
    cityName,
  };
};

const orgCityName = async (ctx: Ctx, org: Organization): Promise<string | undefined> => {
  if (!org.cityId) return undefined;
  const [row] = await ctx.db.select({ name: city.name }).from(city).where(eq(city.id, org.cityId)).limit(1);
  return row?.name;
};
