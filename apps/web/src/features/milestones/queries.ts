import {
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import type { UpdateMilestoneRequest } from '@time-capsule/shared';
import { familyMembersKey } from '~/features/family-members/queries';
import { placesKey } from '~/features/places/queries';
import {
  createMilestone,
  deleteMilestone,
  getMilestone,
  listMilestones,
  updateMilestone,
} from './api';

// Query options shared by loaders (queryClient.query) and components (useSuspenseQuery).
// Every key starts with 'milestones'.
export const milestoneQueries = {
  list: () =>
    queryOptions({ queryKey: ['milestones', 'list'], queryFn: listMilestones }),
  detail: (id: number) =>
    queryOptions({
      queryKey: ['milestones', 'detail', id],
      queryFn: () => getMilestone(id),
    }),
};

// Mutation hooks own cache updates; components own navigation (await mutateAsync, then
// navigate). onSuccess RETURNS the invalidation promise: v5 awaits it, so the mutation stays
// pending until the cache is up to date. Every write also invalidates the family members and
// the places: their pages list the milestones they take part in, or that happened there.

export function useCreateMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createMilestone,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: milestoneQueries.list().queryKey,
        }),
        queryClient.invalidateQueries({ queryKey: familyMembersKey }),
        queryClient.invalidateQueries({ queryKey: placesKey }),
      ]),
  });
}

export function useUpdateMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, request }: { id: number; request: UpdateMilestoneRequest }) =>
      updateMilestone(id, request),
    onSuccess: (milestone) => {
      // The response is the fresh row: cache it instead of refetching the detail.
      queryClient.setQueryData(
        milestoneQueries.detail(milestone.id).queryKey,
        milestone,
      );
      return Promise.all([
        queryClient.invalidateQueries({
          queryKey: milestoneQueries.list().queryKey,
        }),
        queryClient.invalidateQueries({ queryKey: familyMembersKey }),
        queryClient.invalidateQueries({ queryKey: placesKey }),
      ]);
    },
  });
}

export function useDeleteMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteMilestone,
    onSuccess: (_data, id) => {
      queryClient.removeQueries({
        queryKey: milestoneQueries.detail(id).queryKey,
      });
      return Promise.all([
        queryClient.invalidateQueries({
          queryKey: milestoneQueries.list().queryKey,
        }),
        queryClient.invalidateQueries({ queryKey: familyMembersKey }),
        queryClient.invalidateQueries({ queryKey: placesKey }),
        // Its photos linked nowhere else are deleted with it (features/media imports this
        // module, so the key is spelled here).
        queryClient.invalidateQueries({ queryKey: ['media'] }),
      ]);
    },
  });
}
