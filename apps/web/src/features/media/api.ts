import {
  createMediaResponseSchema,
  mediaResponseSchema,
  type CreateMediaRequest,
  type CreateMediaResponse,
  type MediaResponse,
  type MediaTarget,
  type UpdateMilestoneMediaRequest,
} from '@time-capsule/shared';
import { apiRequest } from '~/lib/api-client';

// Fetchers for /media and PUT /<owner>/:id/media. Every response is parsed with the shared
// contract. The file itself goes to storage through ~/lib/upload, not through the api.

const ownerPath = (target: MediaTarget) =>
  target.type === 'milestone'
    ? `/milestones/${target.id}`
    : `/family-members/${target.id}`;

/** Reserves a slot on the owner; answers the presigned POST for the storage server. */
export async function createMedia(
  request: CreateMediaRequest,
): Promise<CreateMediaResponse> {
  return createMediaResponseSchema.parse(
    await apiRequest('POST', '/media', request),
  );
}

export async function confirmMedia(id: number): Promise<MediaResponse> {
  return mediaResponseSchema.parse(
    await apiRequest('POST', `/media/${id}/confirm`),
  );
}

export async function deleteMedia(id: number): Promise<void> {
  await apiRequest('DELETE', `/media/${id}`);
}

export async function listMedia(): Promise<MediaResponse[]> {
  return mediaResponseSchema.array().parse(await apiRequest('GET', '/media'));
}

/** The PUT body; both owners' requests have the same shape. */
export type UpdateOwnerMediaRequest = UpdateMilestoneMediaRequest;

/**
 * Replaces the owner's photos with `mediaIds`, in that order; answers the new set. 409
 * `validation.media.stale` when `baseMediaIds` isn't the owner's current set.
 */
export async function updateOwnerMedia(
  target: MediaTarget,
  request: UpdateOwnerMediaRequest,
): Promise<MediaResponse[]> {
  return mediaResponseSchema
    .array()
    .parse(await apiRequest('PUT', `${ownerPath(target)}/media`, request));
}
