import {
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import type { UpdateMilestoneRequest } from '@time-capsule/shared';
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
// pending until the cache is up to date.

export function useCreateMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createMilestone,
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: milestoneQueries.list().queryKey,
      }),
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
      return queryClient.invalidateQueries({
        queryKey: milestoneQueries.list().queryKey,
      });
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
      return queryClient.invalidateQueries({
        queryKey: milestoneQueries.list().queryKey,
      });
    },
  });
}
