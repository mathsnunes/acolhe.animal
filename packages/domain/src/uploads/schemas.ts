import { z } from 'zod';

import { UPLOAD_POLICIES, uploadFileMetaSchema, type UploadPolicyKey } from '@acolhe-animal/shared';

/**
 * Input schemas for the upload flow. The per-file/quota rules live in the shared
 * `uploadBatchSchema(policy)` (applied in the service once the policy is known);
 * here we validate the request envelope.
 */

const policyKeys = Object.keys(UPLOAD_POLICIES) as [UploadPolicyKey, ...UploadPolicyKey[]];

/** What an upload is attached to. Animals (photos/videos) and the org (logo). */
export const uploadOwnerSchema = z.object({
  type: z.enum(['animal', 'organization']),
  id: z.string().min(1),
});
export type UploadOwnerRef = z.infer<typeof uploadOwnerSchema>;

export const requestUploadsSchema = z.object({
  policy: z.enum(policyKeys),
  owner: uploadOwnerSchema,
  files: z.array(uploadFileMetaSchema).min(1, 'Selecione ao menos um arquivo.'),
});
export type RequestUploadsInput = z.infer<typeof requestUploadsSchema>;
