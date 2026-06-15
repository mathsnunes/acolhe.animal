import { and, asc, eq, inArray, lt } from 'drizzle-orm';

import {
  createId,
  getUploadPolicy,
  NotFoundError,
  uploadBatchSchema,
  UPLOAD_POLICIES,
  ValidationError,
  type UploadPolicy,
  type UploadPolicyKey,
} from '@acolhe-animal/shared';
import {
  animal,
  animalPhoto,
  animalVideo,
  upload,
  type AnimalPhoto,
  type AnimalVideo,
  type Upload,
} from '@acolhe-animal/db';
import { extractVideoPoster, getStorage, processImage, transcodeVideo } from '@acolhe-animal/integrations';

import type { Ctx } from '../context';
import { withTransaction } from '../context';
import { assertCanManageAnimals } from '../auth/permissions';
import { getAnimal } from '../animals/service';
import { requestUploadsSchema } from './schemas';

/**
 * The upload library's brain. The browser uploads bytes straight to storage via a
 * presigned URL (`requestUploads`); each file is then `commitUpload`ed — images
 * are processed inline (sharp → thumb/medium) and videos are queued for the async
 * worker (`processNextVideo`). Orphaned `pending` rows are reclaimed by
 * `sweepExpiredUploads`. See `docs/uploads.md`.
 */

/** How long a presigned URL / pending upload stays valid before the sweep reclaims it. */
const UPLOAD_TTL_SEC = 24 * 60 * 60;
const UPLOAD_TTL_MS = UPLOAD_TTL_SEC * 1000;

// ── Storage keys (deterministic, so the worker/cleanup can reconstruct them) ──
const tmpKey = (organizationId: number, uploadId: string): string =>
  `tmp/${organizationId}/${uploadId}/original`;
const photoKey = (animalPublicId: string, photoId: string, name: string): string =>
  `animals/${animalPublicId}/photos/${photoId}/${name}`;
const videoKey = (animalPublicId: string, videoId: string, name: string): string =>
  `animals/${animalPublicId}/videos/${videoId}/${name}`;

export interface UploadTicketResult {
  uploadId: string;
  url: string;
  method: 'PUT';
  headers: Record<string, string>;
}

/**
 * Validate a batch against its policy, reserve `pending` ledger rows in the temp
 * prefix, and mint a presigned URL per file. The bytes never touch our server.
 */
export const requestUploads = async (ctx: Ctx, input: unknown): Promise<UploadTicketResult[]> => {
  assertCanManageAnimals(ctx);
  const { policy: policyKey, owner, files } = requestUploadsSchema.parse(input);
  const policy = getUploadPolicy(policyKey);
  uploadBatchSchema(policy).parse(files); // count / type / per-file & total size

  const ownerAnimal = await getAnimal(ctx, owner.id); // tenant + existence check

  const used = await countOwnerMedia(ctx, policy, owner.id, ownerAnimal.pk);
  if (used + files.length > policy.maxFiles) {
    throw new ValidationError(`Limite de ${policy.maxFiles} arquivo(s) por animal atingido.`);
  }

  const storage = getStorage();
  const expiresAt = new Date(Date.now() + UPLOAD_TTL_MS);
  const actorId = ctx.actor.type === 'user' ? ctx.actor.userId : null;

  const tickets: UploadTicketResult[] = [];
  for (const file of files) {
    const uploadId = createId('upload');
    const key = tmpKey(ctx.organizationId, uploadId);
    const ticket = await storage.createUploadUrl({
      key,
      contentType: file.contentType,
      maxBytes: policy.maxFileSize,
      expiresInSec: UPLOAD_TTL_SEC,
    });
    await ctx.db.insert(upload).values({
      id: uploadId,
      organizationId: ctx.organizationId,
      status: 'pending',
      policy: policyKey,
      storageKey: key,
      contentType: file.contentType,
      sizeBytes: file.size,
      originalFilename: file.filename,
      ownerType: owner.type,
      ownerId: owner.id,
      createdBy: actorId,
      expiresAt,
    });
    tickets.push({ uploadId, url: ticket.uploadUrl, method: ticket.method, headers: ticket.headers });
  }
  return tickets;
};

/**
 * Finalize one uploaded file: verify the real bytes, process (image) or queue
 * (video), promote to the final prefix, and flip the ledger row to `committed`.
 * Returns the created photo or video row.
 */
export const commitUpload = async (ctx: Ctx, uploadId: string): Promise<AnimalPhoto | AnimalVideo> => {
  assertCanManageAnimals(ctx);
  const row = await loadPendingUpload(ctx, uploadId);

  if (!(row.policy in UPLOAD_POLICIES)) {
    await markFailed(ctx, row.pk);
    throw new ValidationError('Política de upload desconhecida.');
  }
  const policy = getUploadPolicy(row.policy as UploadPolicyKey);
  const storage = getStorage();

  const info = await storage.exists(row.storageKey);
  if (!info) {
    await markFailed(ctx, row.pk);
    throw new ValidationError('O arquivo não foi enviado. Tente novamente.');
  }
  if (info.size > policy.maxFileSize) {
    await failAndDelete(ctx, row, storage);
    throw new ValidationError('Arquivo acima do tamanho permitido.');
  }
  if (row.ownerType !== 'animal' || !row.ownerId) {
    throw new ValidationError('Upload sem destino válido.');
  }
  const ownerAnimal = await getAnimal(ctx, row.ownerId);

  return policy.kind === 'image'
    ? commitPhoto(ctx, row, ownerAnimal.pk, ownerAnimal.id)
    : commitVideo(ctx, row, ownerAnimal.pk, ownerAnimal.id);
};

const commitPhoto = async (
  ctx: Ctx,
  row: Upload,
  animalPk: number,
  animalPublicId: string,
): Promise<AnimalPhoto> => {
  const storage = getStorage();
  const original = await storage.get(row.storageKey);

  let derivatives;
  try {
    derivatives = await processImage(original);
  } catch {
    await failAndDelete(ctx, row, storage);
    throw new ValidationError('Não foi possível processar a imagem. Envie um arquivo válido.');
  }

  const photoId = createId('animalPhoto');
  const originalFinal = photoKey(animalPublicId, photoId, 'original');
  const mediumK = photoKey(animalPublicId, photoId, 'medium.webp');
  const thumbK = photoKey(animalPublicId, photoId, 'thumb.webp');

  await storage.put({ key: mediumK, body: derivatives.medium.body, contentType: 'image/webp' });
  await storage.put({ key: thumbK, body: derivatives.thumb.body, contentType: 'image/webp' });
  await storage.move(row.storageKey, originalFinal);

  const order = await nextDisplayOrder(ctx, animalPhoto, animalPk);
  const hasPrimary = await animalHasPrimaryPhoto(ctx, animalPk);

  return withTransaction(ctx, async (txc) => {
    const [photo] = await txc.db
      .insert(animalPhoto)
      .values({
        id: photoId,
        animalId: animalPk,
        originalUrl: storage.getPublicUrl(originalFinal),
        mediumUrl: storage.getPublicUrl(mediumK),
        thumbUrl: storage.getPublicUrl(thumbK),
        displayOrder: order,
        isPrimary: !hasPrimary,
      })
      .returning();
    if (!photo) throw new Error('Falha ao salvar a foto.');
    await markCommitted(txc, row.pk, originalFinal);
    return photo;
  });
};

const commitVideo = async (
  ctx: Ctx,
  row: Upload,
  animalPk: number,
  animalPublicId: string,
): Promise<AnimalVideo> => {
  const storage = getStorage();
  const original = await storage.get(row.storageKey);

  // Poster + metadata are extracted synchronously so the UI shows a thumbnail
  // immediately; the heavy transcode is left to the background worker. A failure
  // here means the bytes aren't a usable video, so we reject the upload.
  let poster;
  try {
    poster = await extractVideoPoster(original);
  } catch (err) {
    console.error('[uploads] video poster extraction failed:', err);
    await failAndDelete(ctx, row, storage);
    throw new ValidationError('Não foi possível processar o vídeo. Envie um arquivo válido.');
  }

  const videoId = createId('animalVideo');
  const originalFinal = videoKey(animalPublicId, videoId, 'original');
  const posterK = videoKey(animalPublicId, videoId, 'poster.jpg');
  await storage.put({ key: posterK, body: poster.poster.body, contentType: poster.poster.contentType });
  await storage.move(row.storageKey, originalFinal);

  const order = await nextDisplayOrder(ctx, animalVideo, animalPk);

  return withTransaction(ctx, async (txc) => {
    const [video] = await txc.db
      .insert(animalVideo)
      .values({
        id: videoId,
        animalId: animalPk,
        originalUrl: storage.getPublicUrl(originalFinal),
        posterUrl: storage.getPublicUrl(posterK),
        durationSeconds: poster.durationSeconds,
        format: poster.format,
        processingStatus: 'pending', // worker will transcode → 'ready'
        displayOrder: order,
      })
      .returning();
    if (!video) throw new Error('Falha ao salvar o vídeo.');
    await markCommitted(txc, row.pk, originalFinal);
    return video;
  });
};

/**
 * Worker step: claim one queued video (`FOR UPDATE SKIP LOCKED`), transcode it,
 * extract a poster, and advance it to `ready` (or `failed`). Returns `true` if a
 * video was picked up — loop while it does.
 */
export const processNextVideo = async (ctx: Ctx): Promise<boolean> => {
  const claimed = await withTransaction(ctx, async (txc) => {
    const rows = await txc.db
      .select({ video: animalVideo, animalPublicId: animal.id })
      .from(animalVideo)
      .innerJoin(animal, eq(animalVideo.animalId, animal.pk))
      .where(and(eq(animal.organizationId, ctx.organizationId), eq(animalVideo.processingStatus, 'pending')))
      .orderBy(asc(animalVideo.createdAt))
      .limit(1)
      .for('update', { skipLocked: true });

    const next = rows[0];
    if (!next) return null;
    await txc.db
      .update(animalVideo)
      .set({ processingStatus: 'processing' })
      .where(eq(animalVideo.pk, next.video.pk));
    return next;
  });

  if (!claimed) return false;

  const { video, animalPublicId } = claimed;
  const storage = getStorage();
  const originalKey = videoKey(animalPublicId, video.id, 'original');

  try {
    // Poster/duration/format were set at commit; the worker only transcodes.
    const result = await transcodeVideo(await storage.get(originalKey));
    const processedK = videoKey(animalPublicId, video.id, 'processed.mp4');
    await storage.put({ key: processedK, body: result.processed.body, contentType: result.processed.contentType });
    await ctx.db
      .update(animalVideo)
      .set({ processingStatus: 'ready', processedUrl: storage.getPublicUrl(processedK) })
      .where(eq(animalVideo.pk, video.pk));
  } catch (err) {
    console.error(`[uploads] video ${video.id} transcode failed:`, err);
    await ctx.db
      .update(animalVideo)
      .set({ processingStatus: 'failed' })
      .where(eq(animalVideo.pk, video.pk));
  }
  return true;
};

/** Delete a photo (storage objects + row); promotes the next photo to primary. */
export const deleteAnimalPhoto = async (ctx: Ctx, photoId: string): Promise<void> => {
  assertCanManageAnimals(ctx);
  const [found] = await ctx.db
    .select({ photo: animalPhoto, animalPublicId: animal.id })
    .from(animalPhoto)
    .innerJoin(animal, eq(animalPhoto.animalId, animal.pk))
    .where(and(eq(animalPhoto.id, photoId), eq(animal.organizationId, ctx.organizationId)))
    .limit(1);
  if (!found) throw new NotFoundError('Foto não encontrada.');

  const { photo, animalPublicId } = found;
  const storage = getStorage();
  for (const name of ['original', 'medium.webp', 'thumb.webp']) {
    try {
      await storage.delete(photoKey(animalPublicId, photo.id, name));
    } catch {
      // best-effort; the row removal is what matters for the user
    }
  }
  await ctx.db.delete(animalPhoto).where(eq(animalPhoto.pk, photo.pk));

  if (photo.isPrimary) {
    const [next] = await ctx.db
      .select()
      .from(animalPhoto)
      .where(eq(animalPhoto.animalId, photo.animalId))
      .orderBy(asc(animalPhoto.displayOrder))
      .limit(1);
    if (next) {
      await ctx.db.update(animalPhoto).set({ isPrimary: true }).where(eq(animalPhoto.pk, next.pk));
    }
  }
};

/** Photos of an animal, ordered for display. */
export const listAnimalPhotos = async (ctx: Ctx, animalId: string): Promise<AnimalPhoto[]> => {
  const ownerAnimal = await getAnimal(ctx, animalId);
  return ctx.db
    .select()
    .from(animalPhoto)
    .where(eq(animalPhoto.animalId, ownerAnimal.pk))
    .orderBy(asc(animalPhoto.displayOrder));
};

/**
 * Make one photo the animal's cover (exactly one `isPrimary` per animal). Clears
 * the previous cover and sets the target, atomically.
 */
export const setAnimalCoverPhoto = async (ctx: Ctx, photoId: string): Promise<void> => {
  assertCanManageAnimals(ctx);
  const [found] = await ctx.db
    .select({ photo: animalPhoto })
    .from(animalPhoto)
    .innerJoin(animal, eq(animalPhoto.animalId, animal.pk))
    .where(and(eq(animalPhoto.id, photoId), eq(animal.organizationId, ctx.organizationId)))
    .limit(1);
  if (!found) throw new NotFoundError('Foto não encontrada.');

  const { photo } = found;
  if (photo.isPrimary) return;
  await withTransaction(ctx, async (txc) => {
    await txc.db
      .update(animalPhoto)
      .set({ isPrimary: false })
      .where(and(eq(animalPhoto.animalId, photo.animalId), eq(animalPhoto.isPrimary, true)));
    await txc.db.update(animalPhoto).set({ isPrimary: true }).where(eq(animalPhoto.pk, photo.pk));
  });
};

/** The animal's cover photo: the `isPrimary` one, else the first by display order. */
export const getAnimalCover = async (ctx: Ctx, animalId: string): Promise<AnimalPhoto | null> => {
  const ownerAnimal = await getAnimal(ctx, animalId);
  const rows = await ctx.db
    .select()
    .from(animalPhoto)
    .where(eq(animalPhoto.animalId, ownerAnimal.pk))
    .orderBy(asc(animalPhoto.displayOrder));
  return rows.find((p) => p.isPrimary) ?? rows[0] ?? null;
};

/**
 * Cover photo for many animals at once (for listings). Keyed by the animal's
 * public id; prefers `isPrimary`, falling back to the lowest display order.
 */
export const getAnimalCovers = async (
  ctx: Ctx,
  animalPks: number[],
): Promise<Record<string, AnimalPhoto>> => {
  if (animalPks.length === 0) return {};
  const rows = await ctx.db
    .select({ photo: animalPhoto, animalPublicId: animal.id })
    .from(animalPhoto)
    .innerJoin(animal, eq(animalPhoto.animalId, animal.pk))
    .where(and(eq(animal.organizationId, ctx.organizationId), inArray(animalPhoto.animalId, animalPks)))
    .orderBy(asc(animalPhoto.displayOrder));

  const covers: Record<string, AnimalPhoto> = {};
  for (const { photo, animalPublicId } of rows) {
    const current = covers[animalPublicId];
    if (!current || (photo.isPrimary && !current.isPrimary)) covers[animalPublicId] = photo;
  }
  return covers;
};

/** Videos of an animal, ordered for display (any processing status). */
export const listAnimalVideos = async (ctx: Ctx, animalId: string): Promise<AnimalVideo[]> => {
  const ownerAnimal = await getAnimal(ctx, animalId);
  return ctx.db
    .select()
    .from(animalVideo)
    .where(eq(animalVideo.animalId, ownerAnimal.pk))
    .orderBy(asc(animalVideo.displayOrder));
};

/** Delete a video (original + processed + poster objects, then the row). */
export const deleteAnimalVideo = async (ctx: Ctx, videoId: string): Promise<void> => {
  assertCanManageAnimals(ctx);
  const [found] = await ctx.db
    .select({ video: animalVideo, animalPublicId: animal.id })
    .from(animalVideo)
    .innerJoin(animal, eq(animalVideo.animalId, animal.pk))
    .where(and(eq(animalVideo.id, videoId), eq(animal.organizationId, ctx.organizationId)))
    .limit(1);
  if (!found) throw new NotFoundError('Vídeo não encontrado.');

  const { video, animalPublicId } = found;
  const storage = getStorage();
  for (const name of ['original', 'processed.mp4', 'poster.jpg']) {
    try {
      await storage.delete(videoKey(animalPublicId, video.id, name));
    } catch {
      // best-effort
    }
  }
  await ctx.db.delete(animalVideo).where(eq(animalVideo.pk, video.pk));
};

/** Reclaim orphans: delete expired `pending` uploads from storage + the ledger. */
export const sweepExpiredUploads = async (ctx: Ctx): Promise<number> => {
  const expired = await ctx.db
    .select()
    .from(upload)
    .where(
      and(
        eq(upload.organizationId, ctx.organizationId),
        eq(upload.status, 'pending'),
        lt(upload.expiresAt, new Date()),
      ),
    );
  const storage = getStorage();
  for (const row of expired) {
    try {
      await storage.delete(row.storageKey);
    } catch {
      // object may already be gone; still drop the row
    }
    await ctx.db.delete(upload).where(eq(upload.pk, row.pk));
  }
  return expired.length;
};

// ── internals ────────────────────────────────────────────────────────────────

const loadPendingUpload = async (ctx: Ctx, uploadId: string): Promise<Upload> => {
  const [row] = await ctx.db
    .select()
    .from(upload)
    .where(and(eq(upload.id, uploadId), eq(upload.organizationId, ctx.organizationId)))
    .limit(1);
  if (!row) throw new NotFoundError('Upload não encontrado.');
  if (row.status !== 'pending') throw new ValidationError('Este upload já foi processado.');
  return row;
};

const countOwnerMedia = async (
  ctx: Ctx,
  policy: UploadPolicy,
  ownerId: string,
  animalPk: number,
): Promise<number> => {
  const pending = await ctx.db
    .select({ pk: upload.pk })
    .from(upload)
    .where(
      and(
        eq(upload.organizationId, ctx.organizationId),
        eq(upload.ownerId, ownerId),
        eq(upload.policy, policy.key),
        eq(upload.status, 'pending'),
      ),
    );
  const table = policy.kind === 'image' ? animalPhoto : animalVideo;
  const committed = await ctx.db.select({ pk: table.pk }).from(table).where(eq(table.animalId, animalPk));
  return pending.length + committed.length;
};

const nextDisplayOrder = async (
  ctx: Ctx,
  table: typeof animalPhoto | typeof animalVideo,
  animalPk: number,
): Promise<number> => {
  const rows = await ctx.db.select({ order: table.displayOrder }).from(table).where(eq(table.animalId, animalPk));
  return rows.reduce((max, r) => Math.max(max, r.order), -1) + 1;
};

const animalHasPrimaryPhoto = async (ctx: Ctx, animalPk: number): Promise<boolean> => {
  const [row] = await ctx.db
    .select({ pk: animalPhoto.pk })
    .from(animalPhoto)
    .where(and(eq(animalPhoto.animalId, animalPk), eq(animalPhoto.isPrimary, true)))
    .limit(1);
  return Boolean(row);
};

const markCommitted = async (ctx: Ctx, uploadPk: number, finalKey: string): Promise<void> => {
  await ctx.db
    .update(upload)
    .set({ status: 'committed', committedAt: new Date(), storageKey: finalKey })
    .where(eq(upload.pk, uploadPk));
};

const markFailed = async (ctx: Ctx, uploadPk: number): Promise<void> => {
  await ctx.db.update(upload).set({ status: 'failed' }).where(eq(upload.pk, uploadPk));
};

const failAndDelete = async (
  ctx: Ctx,
  row: Upload,
  storage: ReturnType<typeof getStorage>,
): Promise<void> => {
  try {
    await storage.delete(row.storageKey);
  } catch {
    // ignore — marking failed is the important part
  }
  await markFailed(ctx, row.pk);
};
