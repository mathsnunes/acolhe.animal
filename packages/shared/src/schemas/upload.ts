import { z } from 'zod';

import { formatBytes } from '../utils/format';

/**
 * Upload policies — the reusable contract for the file-upload library.
 *
 * A policy is isomorphic config: the same definition powers client-side UX
 * (instant feedback when picking files) and is re-enforced server-side in the
 * domain (never trust the client). Add a policy per upload context. See
 * `docs/uploads.md`.
 */

/** What kind of processing a committed upload goes through. */
export type UploadKind = 'image' | 'video';

export interface UploadPolicy {
  /** Stable key, referenced by the request action and the DB ledger. */
  readonly key: string;
  readonly kind: UploadKind;
  /** Allowed MIME types. */
  readonly accept: readonly string[];
  /** Max number of files in a single batch / per owner. */
  readonly maxFiles: number;
  /** Max size of a single file, in bytes. */
  readonly maxFileSize: number;
  /** Max combined size of the batch, in bytes. */
  readonly maxTotalSize: number;
}

const MB = 1024 * 1024;

/** Registered policies. One per upload context (animals, docs, receipts…). */
export const UPLOAD_POLICIES = {
  'animal-photos': {
    key: 'animal-photos',
    kind: 'image',
    accept: ['image/jpeg', 'image/png', 'image/webp'],
    maxFiles: 8,
    maxFileSize: 10 * MB,
    maxTotalSize: 50 * MB,
  },
  'animal-videos': {
    key: 'animal-videos',
    kind: 'video',
    accept: ['video/mp4', 'video/quicktime'],
    maxFiles: 3,
    maxFileSize: 200 * MB,
    maxTotalSize: 400 * MB,
  },
} as const satisfies Record<string, UploadPolicy>;

export type UploadPolicyKey = keyof typeof UPLOAD_POLICIES;

export const getUploadPolicy = (key: UploadPolicyKey): UploadPolicy => UPLOAD_POLICIES[key];

/** Metadata the client declares for each file when requesting upload URLs. */
export const uploadFileMetaSchema = z.object({
  filename: z.string().trim().min(1, 'Nome de arquivo inválido.').max(255),
  contentType: z.string().trim().min(1, 'Tipo de arquivo inválido.'),
  size: z.number().int().positive('Arquivo vazio.'),
});
export type UploadFileMeta = z.infer<typeof uploadFileMetaSchema>;

/**
 * Build a Zod schema that validates a batch of files against a policy
 * (count, per-file type/size, total size). Used by the form for instant feedback
 * and re-used by the domain at request time, so the rules live in one place.
 */
export const uploadBatchSchema = (policy: UploadPolicy) =>
  z
    .array(uploadFileMetaSchema)
    .min(1, 'Selecione ao menos um arquivo.')
    .max(policy.maxFiles, `Envie no máximo ${policy.maxFiles} arquivo(s) por vez.`)
    .superRefine((files, ctx) => {
      let total = 0;
      files.forEach((file, index) => {
        if (!policy.accept.includes(file.contentType)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [index, 'contentType'],
            message: 'Tipo de arquivo não permitido.',
          });
        }
        if (file.size > policy.maxFileSize) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [index, 'size'],
            message: `Cada arquivo deve ter no máximo ${formatBytes(policy.maxFileSize)}.`,
          });
        }
        total += file.size;
      });
      if (total > policy.maxTotalSize) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `O total enviado deve ter no máximo ${formatBytes(policy.maxTotalSize)}.`,
        });
      }
    });
