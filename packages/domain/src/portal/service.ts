import { and, asc, count, desc, eq, isNull } from 'drizzle-orm';

import { adoption, animal, animalPhoto, animalVideo, type Animal } from '@acolhe-animal/db';

import type { Ctx } from '../context';
import { listAnimals } from '../animals/service';
import { getAnimalCovers } from '../uploads/service';

/**
 * The public portal read model. Every function takes the (public) Ctx and is
 * tenant-scoped via `ctx.organizationId`, so the web layer never queries the DB
 * itself — it only builds the Ctx and calls in (see the golden rule in CLAUDE.md).
 */

/** Cap on animals loaded for the portal (sections + client-side filters). */
const PORTAL_ANIMALS_CAP = 200;

export interface PortalAnimalItem {
  animal: Animal;
  photoUrl: string | null;
}

export interface PortalAnimalsPage {
  items: PortalAnimalItem[];
  nextOffset: number;
  hasMore: boolean;
}

export interface PortalVideo {
  id: string;
  src: string;
  poster: string | null;
}

export interface PortalAnimalDetail {
  animal: Animal;
  photoUrl: string | null;
  photos: string[];
  videos: PortalVideo[];
}

export interface PortalStats {
  adoptionsCount: number;
  recent: Array<{ id: string; name: string; photoUrl: string | null }>;
}

/** Cover medium-url map (animal public id → url), from the shared cover loader. */
const coverUrls = async (ctx: Ctx, pks: number[]): Promise<Record<string, string>> => {
  const covers = await getAnimalCovers(ctx, pks);
  const map: Record<string, string> = {};
  for (const [id, photo] of Object.entries(covers)) map[id] = photo.mediumUrl;
  return map;
};

const toItems = async (ctx: Ctx, rows: Animal[]): Promise<PortalAnimalItem[]> => {
  const photos = await coverUrls(ctx, rows.map((a) => a.pk));
  return rows.map((a) => ({ animal: a, photoUrl: photos[a.id] ?? null }));
};

/** Every adoptable animal shown publicly (capped), each with its cover photo. */
export const listPortalAnimals = async (ctx: Ctx): Promise<PortalAnimalItem[]> => {
  const rows = await listAnimals(ctx, {
    status: ['available'],
    visibleOnPortal: true,
    limit: PORTAL_ANIMALS_CAP,
    offset: 0,
  });
  return toItems(ctx, rows);
};

/** A page of publicly-shown animals (legacy infinite-scroll path). */
export const listPortalAnimalsPage = async (
  ctx: Ctx,
  page: { limit: number; offset: number },
): Promise<PortalAnimalsPage> => {
  const rows = await listAnimals(ctx, {
    status: ['available'],
    visibleOnPortal: true,
    limit: page.limit,
    offset: page.offset,
  });
  const items = await toItems(ctx, rows);
  return { items, nextOffset: page.offset + rows.length, hasMore: rows.length === page.limit };
};

/** A single public animal with its full ordered photo set + playable videos. */
export const getPortalAnimal = async (
  ctx: Ctx,
  animalId: string,
): Promise<PortalAnimalDetail | null> => {
  const [row] = await ctx.db
    .select()
    .from(animal)
    .where(and(eq(animal.id, animalId), eq(animal.organizationId, ctx.organizationId)))
    .limit(1);
  if (!row) return null;

  // Photos and videos depend only on the animal pk — fetch them together.
  const [photoRows, videoRows] = await Promise.all([
    ctx.db
      .select({ mediumUrl: animalPhoto.mediumUrl, isPrimary: animalPhoto.isPrimary })
      .from(animalPhoto)
      .where(eq(animalPhoto.animalId, row.pk))
      .orderBy(asc(animalPhoto.displayOrder)),
    // Only fully-transcoded videos are playable on the public portal.
    ctx.db
      .select({ id: animalVideo.id, processedUrl: animalVideo.processedUrl, posterUrl: animalVideo.posterUrl })
      .from(animalVideo)
      .where(and(eq(animalVideo.animalId, row.pk), eq(animalVideo.processingStatus, 'ready')))
      .orderBy(asc(animalVideo.displayOrder)),
  ]);

  // Stable sort keeps display order while floating the primary to the front.
  const photos = [...photoRows]
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary))
    .map((p) => p.mediumUrl);
  const videos: PortalVideo[] = videoRows
    .filter((v): v is { id: string; processedUrl: string; posterUrl: string | null } => Boolean(v.processedUrl))
    .map((v) => ({ id: v.id, src: v.processedUrl, poster: v.posterUrl }));

  return { animal: row, photoUrl: photos[0] ?? null, photos, videos };
};

/** Lives changed: count of active adoptions + a few recently adopted animals. */
export const getPortalStats = async (ctx: Ctx): Promise<PortalStats> => {
  // The count and the recent-rows query are independent — run them together.
  const [[counted], rows] = await Promise.all([
    ctx.db
      .select({ n: count() })
      .from(adoption)
      .where(and(eq(adoption.organizationId, ctx.organizationId), isNull(adoption.cancelledAt))),
    ctx.db
      .select({ id: animal.id, name: animal.name, animalPk: animal.pk })
      .from(adoption)
      .innerJoin(animal, eq(adoption.animalId, animal.pk))
      .where(and(eq(adoption.organizationId, ctx.organizationId), isNull(adoption.cancelledAt)))
      .orderBy(desc(adoption.adoptedAt))
      .limit(24),
  ]);

  const photos = await coverUrls(ctx, rows.map((r) => r.animalPk));
  const seen = new Set<string>();
  const recent: PortalStats['recent'] = [];
  for (const r of rows) {
    if (seen.has(r.id)) continue; // an animal returned + re-adopted shows once
    seen.add(r.id);
    recent.push({ id: r.id, name: r.name, photoUrl: photos[r.id] ?? null });
    if (recent.length >= 10) break;
  }
  return { adoptionsCount: Number(counted?.n ?? 0), recent };
};
