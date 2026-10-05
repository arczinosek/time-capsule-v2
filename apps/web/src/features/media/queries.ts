import {
  queryOptions,
  useMutation,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import {
  messages,
  type MediaResponse,
  type MediaTarget,
} from '@time-capsule/shared';
import { familyMemberQueries } from '~/features/family-members/queries';
import { milestoneQueries } from '~/features/milestones/queries';
import { ApiError } from '~/lib/api-client';
import {
  listMedia,
  updateOwnerMedia,
  type UpdateOwnerMediaRequest,
} from './api';

// Every key starts with 'media'. This module imports the owners' query keys, never the other
// way round: owner hooks invalidate the literal ['media'] after a delete (orphans go too).
export const mediaKey = ['media'] as const;

export const mediaQueries = {
  library: () =>
    queryOptions({ queryKey: [...mediaKey, 'library'], queryFn: listMedia }),
};

/** Refetches what shows the owner's photos, and the library. */
export function invalidateOwnerMedia(
  queryClient: QueryClient,
  target: MediaTarget,
): Promise<unknown> {
  return Promise.all([
    target.type === 'milestone'
      ? // The list embeds photos too.
        queryClient.invalidateQueries({ queryKey: ['milestones'] })
      : queryClient.invalidateQueries({
          queryKey: familyMemberQueries.detail(target.id).queryKey,
        }),
    queryClient.invalidateQueries({ queryKey: mediaKey }),
  ]);
}

/**
 * PUT the owner's photos: unlink = the current ids minus one, link from the library = plus one,
 * reorder = the same ids in a new order. `baseMediaIds` are the ids on screen; when the api
 * answers 409 stale (they changed elsewhere), the owner is refetched and the error shown. The
 * answer is the new set: it goes straight into the owner's cached detail.
 */
export function useUpdateOwnerMedia(target: MediaTarget) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: UpdateOwnerMediaRequest) =>
      updateOwnerMedia(target, request),
    onError: (error) => {
      if (
        error instanceof ApiError &&
        error.status === 409 &&
        error.apiMessage === messages.mediaStale
      ) {
        return invalidateOwnerMedia(queryClient, target);
      }
    },
    onSuccess: (media: MediaResponse[]) => {
      if (target.type === 'milestone') {
        queryClient.setQueryData(
          milestoneQueries.detail(target.id).queryKey,
          (milestone) => milestone && { ...milestone, media },
        );
      } else {
        queryClient.setQueryData(
          familyMemberQueries.detail(target.id).queryKey,
          (familyMember) => familyMember && { ...familyMember, media },
        );
      }
      // Unlinked photos may have been deleted, and the milestone list shows photos.
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: mediaKey }),
        target.type === 'milestone' &&
          queryClient.invalidateQueries({
            queryKey: milestoneQueries.list().queryKey,
          }),
      ]);
    },
  });
}
