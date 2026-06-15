import { db, organization } from '@acolhe-animal/db';
import { processNextVideo, sweepExpiredUploads, type Ctx } from '@acolhe-animal/domain';

/**
 * Media worker — drains the video transcode queue and sweeps orphaned uploads.
 *
 * Run in dev with: `pnpm -F @acolhe-animal/web media:worker`. In production this
 * is the entrypoint a cron/long-running process invokes (the same domain
 * functions an Inngest job would call). See `docs/uploads.md`.
 */

const POLL_MS = 5_000;

const systemCtx = (organizationId: number): Ctx => ({
  db,
  organizationId,
  actor: { type: 'system', source: 'media-worker' },
});

const tick = async (): Promise<void> => {
  const orgs = await db.select({ pk: organization.pk }).from(organization);
  for (const org of orgs) {
    const ctx = systemCtx(org.pk);
    let worked = true;
    while (worked) worked = await processNextVideo(ctx);
    const swept = await sweepExpiredUploads(ctx);
    if (swept > 0) console.log(`[media-worker] org ${org.pk}: swept ${swept} expired upload(s)`);
  }
};

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const main = async (): Promise<void> => {
  console.log(`[media-worker] started — polling every ${POLL_MS / 1000}s`);
  for (;;) {
    try {
      await tick();
    } catch (err) {
      console.error('[media-worker] tick failed:', err);
    }
    await sleep(POLL_MS);
  }
};

void main();
