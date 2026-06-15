import { createRequire } from 'node:module';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import ffmpegStatic from 'ffmpeg-static';
import ffmpeg from 'fluent-ffmpeg';

import type { TranscodedVideo, VideoPoster } from './types';

// `ffprobe-static` ships no type declarations; require it with an explicit shape
// so the import resolves identically from every package that compiles this file.
const ffprobeStatic = createRequire(import.meta.url)('ffprobe-static') as { path: string };

// Point fluent-ffmpeg at the bundled static binaries so no system install is
// required (works in dev, CI and the prod worker the same way).
if (ffmpegStatic) ffmpeg.setFfmpegPath(ffmpegStatic);
ffmpeg.setFfprobePath(ffprobeStatic.path);

/** Longest edge of the transcoded video; larger sources are scaled down. */
const MAX_DIMENSION = 1280;

const withTempFile = async <T>(input: Buffer, fn: (dir: string, inputPath: string) => Promise<T>): Promise<T> => {
  const dir = await mkdtemp(join(tmpdir(), 'acolhe-video-'));
  const inputPath = join(dir, 'input');
  try {
    await writeFile(inputPath, input);
    return await fn(dir, inputPath);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
};

const probe = (path: string): Promise<{ durationSeconds: number; format: string }> =>
  new Promise((resolve, reject) => {
    ffmpeg.ffprobe(path, (err, data) => {
      if (err) return reject(err);
      const durationSeconds = Math.round(data.format.duration ?? 0);
      const format = (data.format.format_name ?? 'mp4').split(',')[0] ?? 'mp4';
      resolve({ durationSeconds, format });
    });
  });

const screenshot = (inputPath: string, folder: string): Promise<void> =>
  new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .on('end', () => resolve())
      .on('error', reject)
      // Capture at the midpoint (a percentage) so it works for any duration,
      // including very short clips where a fixed 1s seek would land past the end.
      .screenshots({ timestamps: ['50%'], filename: 'poster.jpg', folder, size: `${MAX_DIMENSION}x?` });
  });

/**
 * Fast, commit-time step: probe duration/format and grab a poster frame so the
 * UI shows a thumbnail immediately. Throws if the bytes are not a decodable
 * video (doubles as commit-time validation). The full transcode runs later.
 */
export const extractVideoPoster = async (input: Buffer): Promise<VideoPoster> =>
  withTempFile(input, async (dir, inputPath) => {
    const { durationSeconds, format } = await probe(inputPath);
    await screenshot(inputPath, dir);
    const poster = await readFile(join(dir, 'poster.jpg'));
    return { poster: { body: poster, contentType: 'image/jpeg' }, durationSeconds, format };
  });

/**
 * Slow, worker-time step: transcode to a web-friendly MP4 (H.264/AAC, faststart).
 * Throws on a non-decodable input. Poster/duration come from {@link extractVideoPoster}.
 */
export const transcodeVideo = async (input: Buffer): Promise<TranscodedVideo> =>
  withTempFile(input, async (dir, inputPath) => {
    const outputPath = join(dir, 'output.mp4');
    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .videoCodec('libx264')
        .audioCodec('aac')
        .outputOptions([
          '-preset veryfast',
          '-movflags +faststart',
          '-pix_fmt yuv420p',
          `-vf scale='min(${MAX_DIMENSION},iw)':-2`,
        ])
        .format('mp4')
        .on('end', () => resolve())
        .on('error', reject)
        .save(outputPath);
    });
    const processed = await readFile(outputPath);
    return { processed: { body: processed, contentType: 'video/mp4' } };
  });
