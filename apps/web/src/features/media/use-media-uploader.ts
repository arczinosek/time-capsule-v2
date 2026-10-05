import { useQueryClient } from '@tanstack/react-query';
import {
  MAX_MEDIA_SIZE_BYTES,
  MEDIA_CONTENT_TYPES,
  messages,
  type MediaContentType,
  type MediaTarget,
  type MessageKey,
} from '@time-capsule/shared';
import { useRef, useState } from 'react';
import { uploadToStorage } from '~/lib/upload';
import { confirmMedia, createMedia, deleteMedia } from './api';
import { toMediaErrorMessage, type MediaErrorMessage } from './error-message';
import { invalidateOwnerMedia } from './queries';

/** A file on its way: uploading (with progress), or failed (with the reason). */
export type UploadItem = {
  id: number;
  name: string;
  progress: number;
  error?: MediaErrorMessage;
};

/**
 * Uploads picked files one at a time: POST /media (reserves a slot, presigns), the file to
 * storage, then confirm. A file that fails after its slot was reserved gets DELETE /media/:id,
 * so it doesn't hold the slot. Type, size and free slots are checked here first; the api
 * checks them again.
 */
export function useMediaUploader({
  target,
  count,
  max,
  capMessage,
}: {
  target: MediaTarget;
  /** Photos the owner has now. */
  count: number;
  max: number;
  capMessage: MessageKey;
}) {
  const queryClient = useQueryClient();
  const [items, setItems] = useState<UploadItem[]>([]);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const nextId = useRef(1);
  const active = items.filter((item) => !item.error).length;

  const update = (id: number, patch: Partial<UploadItem>) =>
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );

  async function upload(id: number, file: File, contentType: MediaContentType) {
    let reservedId: number | undefined;
    try {
      const presigned = await createMedia({
        target,
        contentType,
        size: file.size,
      });
      reservedId = presigned.mediaId;
      await uploadToStorage({
        url: presigned.url,
        fields: presigned.fields,
        file,
        onProgress: (progress) => update(id, { progress }),
      });
      await confirmMedia(presigned.mediaId);
      reservedId = undefined;
      // The gallery shows the photo once this resolves: only then drop the item.
      await invalidateOwnerMedia(queryClient, target);
      setItems((current) => current.filter((item) => item.id !== id));
    } catch (error) {
      if (reservedId !== undefined) {
        // Best-effort: an abandoned slot is purged by the api after a day anyway.
        deleteMedia(reservedId).catch(() => {});
      }
      update(id, { error: toMediaErrorMessage(error) });
    }
  }

  function addFiles(files: File[]) {
    let free = max - count - active;
    const added: UploadItem[] = [];

    for (const file of files) {
      const item: UploadItem = { id: nextId.current++, name: file.name, progress: 0 };
      const type = MEDIA_CONTENT_TYPES.find((allowed) => allowed === file.type);
      if (!type) {
        item.error = { message: messages.mediaContentTypeInvalid };
      } else if (file.size === 0) {
        item.error = { message: messages.mediaEmpty };
      } else if (file.size > MAX_MEDIA_SIZE_BYTES) {
        item.error = { message: messages.mediaTooLarge };
      } else if (free <= 0) {
        item.error = { message: capMessage };
      } else {
        free--;
        queue.current = queue.current.then(() => upload(item.id, file, type));
      }
      added.push(item);
    }

    setItems((current) => [...current, ...added]);
  }

  const dismiss = (id: number) =>
    setItems((current) => current.filter((item) => item.id !== id));

  return { items, active, addFiles, dismiss };
}
