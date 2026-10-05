import type { MediaResponse } from '@time-capsule/shared';
import type { MediaRow } from './media.service.js';

// Field by field: the storage key and the upload status never reach a response.
export function toMediaResponse(media: MediaRow): MediaResponse {
  return {
    id: media.id,
    url: media.url,
    contentType: media.contentType,
    sizeBytes: media.sizeBytes,
    createdAt: media.createdAt.toISOString(),
  };
}
