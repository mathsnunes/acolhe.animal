'use client';

import { useCallback, useState } from 'react';

import {
  getUploadPolicy,
  uploadBatchSchema,
  type UploadFileMeta,
  type UploadPolicyKey,
} from '@acolhe-animal/shared';
import type { AnimalPhoto, AnimalVideo } from '@acolhe-animal/db';

import { commitUploadAction, requestUploadsAction } from '@/app/(admin)/animals/actions';

/**
 * Headless multi-file uploader. Validates a batch against its policy, requests
 * presigned URLs, uploads each file straight to storage with real progress, then
 * commits it. UI (the dropzone) renders `items`; this hook owns the flow. See
 * `docs/uploads.md`.
 */

export type UploadItemStatus = 'uploading' | 'processing' | 'done' | 'error';

export type CommittedMedia = AnimalPhoto | AnimalVideo;

export interface UploadItem {
  localId: string;
  name: string;
  /** 0–100 upload progress (the PUT to storage). */
  progress: number;
  status: UploadItemStatus;
  error?: string;
  /** Set once committed. */
  media?: CommittedMedia;
}

interface UseUploaderArgs {
  policy: UploadPolicyKey;
  /** Resolve the owner (e.g. ensure the draft exists) right before uploading. */
  resolveOwnerId: () => Promise<string | null>;
  onCommitted?: (media: CommittedMedia) => void;
  /** Surfaced for the whole batch (e.g. policy violation, no owner). */
  onError?: (message: string) => void;
}

const putWithProgress = (
  url: string,
  headers: Record<string, string>,
  file: File,
  onProgress: (pct: number) => void,
): Promise<void> =>
  new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Falha no envio (${xhr.status}).`));
    xhr.onerror = () => reject(new Error('Erro de rede durante o envio.'));
    xhr.send(file);
  });

export const useUploader = ({ policy, resolveOwnerId, onCommitted, onError }: UseUploaderArgs) => {
  const [items, setItems] = useState<UploadItem[]>([]);

  const patch = useCallback((localId: string, next: Partial<UploadItem>) => {
    setItems((prev) => prev.map((it) => (it.localId === localId ? { ...it, ...next } : it)));
  }, []);

  const addFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      const policyDef = getUploadPolicy(policy);
      const metas: UploadFileMeta[] = files.map((f) => ({
        filename: f.name,
        contentType: f.type,
        size: f.size,
      }));

      const parsed = uploadBatchSchema(policyDef).safeParse(metas);
      if (!parsed.success) {
        onError?.(parsed.error.issues[0]?.message ?? 'Arquivos inválidos.');
        return;
      }

      const ownerId = await resolveOwnerId();
      if (!ownerId) {
        onError?.('Preencha nome, espécie e sexo antes de adicionar mídia.');
        return;
      }

      const queued: UploadItem[] = files.map((f) => ({
        localId: crypto.randomUUID(),
        name: f.name,
        progress: 0,
        status: 'uploading',
      }));
      setItems((prev) => [...prev, ...queued]);

      const res = await requestUploadsAction({
        policy,
        owner: { type: 'animal', id: ownerId },
        files: metas,
      });
      if (!res.ok) {
        queued.forEach((it) => patch(it.localId, { status: 'error', error: res.error.message }));
        onError?.(res.error.message);
        return;
      }

      await Promise.all(
        res.data.map(async (ticket, i) => {
          const item = queued[i];
          const file = files[i];
          if (!item || !file) return;
          try {
            await putWithProgress(ticket.url, ticket.headers, file, (pct) => patch(item.localId, { progress: pct }));
            patch(item.localId, { progress: 100, status: 'processing' });

            const committed = await commitUploadAction(ticket.uploadId);
            if (!committed.ok) {
              patch(item.localId, { status: 'error', error: committed.error.message });
              return;
            }
            // Committed media now lives in the parent's grid (a tile). Any further
            // async state (video transcoding) is shown there, not on this item.
            patch(item.localId, { status: 'done', media: committed.data });
            onCommitted?.(committed.data);
          } catch (err) {
            patch(item.localId, {
              status: 'error',
              error: err instanceof Error ? err.message : 'Falha no envio.',
            });
          }
        }),
      );
    },
    [policy, resolveOwnerId, onCommitted, onError, patch],
  );

  /** Drop an in-flight/errored item from the local list (does not touch storage). */
  const dismiss = useCallback((localId: string) => {
    setItems((prev) => prev.filter((it) => it.localId !== localId));
  }, []);

  const isUploading = items.some((it) => it.status === 'uploading' || it.status === 'processing');

  return { items, addFiles, dismiss, isUploading };
};
