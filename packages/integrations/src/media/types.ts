/**
 * Media processing — pure transforms over file bytes, no storage/HTTP awareness.
 * The domain reads the original from storage, calls these, and writes the results
 * back. Image work runs inline at commit; video work runs in the async worker.
 * See `docs/uploads.md`.
 */

export interface ProcessedImage {
  body: Buffer;
  contentType: string;
  width: number;
  height: number;
}

/** Derivatives generated from an uploaded photo. */
export interface ImageDerivatives {
  thumb: ProcessedImage;
  medium: ProcessedImage;
}

/** Cheap, commit-time output: a poster frame + probed metadata. */
export interface VideoPoster {
  /** Poster frame extracted from the video. */
  poster: { body: Buffer; contentType: string };
  durationSeconds: number;
  /** Container/codec descriptor, e.g. `mp4`. */
  format: string;
}

/** Expensive, worker-time output: the web-friendly transcode. */
export interface TranscodedVideo {
  /** Web-friendly transcode (H.264/AAC MP4). */
  processed: { body: Buffer; contentType: string };
}
