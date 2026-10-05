import {
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import type { UpdateFamilyMemberRequest } from '@time-capsule/shared';
import {
  createFamilyMember,
  deleteFamilyMember,
  getFamilyMember,
  listFamilyMembers,
  updateFamilyMember,
} from './api';

// Every key starts with 'family-members'. Other features embed family members (milestone
// participants), so they invalidate this prefix too, and these hooks invalidate theirs.
export const familyMembersKey = ['family-members'] as const;

export const familyMemberQueries = {
  list: () =>
    queryOptions({
      queryKey: [...familyMembersKey, 'list'],
      queryFn: listFamilyMembers,
    }),
  detail: (id: number) =>
    queryOptions({
      queryKey: [...familyMembersKey, 'detail', id],
      queryFn: () => getFamilyMember(id),
    }),
};

// Mutation hooks own cache updates; components own navigation. onSuccess RETURNS the
// invalidation promise, so the mutation stays pending until the cache is up to date.

export function useCreateFamilyMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createFamilyMember,
    // The list, and the parents' pages (their children).
    onSuccess: () => queryClient.invalidateQueries({ queryKey: familyMembersKey }),
  });
}

export function useUpdateFamilyMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      request,
    }: {
      id: number;
      request: UpdateFamilyMemberRequest;
    }) => updateFamilyMember(id, request),
    onSuccess: (familyMember) => {
      queryClient.setQueryData(
        familyMemberQueries.detail(familyMember.id).queryKey,
        familyMember,
      );
      // A new name shows on relatives' pages and on milestones.
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: familyMembersKey }),
        queryClient.invalidateQueries({ queryKey: ['milestones'] }),
      ]);
    },
  });
}

export function useDeleteFamilyMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteFamilyMember,
    onSuccess: (_data, id) => {
      queryClient.removeQueries({
        queryKey: familyMemberQueries.detail(id).queryKey,
      });
      // Children lose this parent, milestones lose this participant, and its photos linked
      // nowhere else are deleted with it.
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: familyMembersKey }),
        queryClient.invalidateQueries({ queryKey: ['milestones'] }),
        queryClient.invalidateQueries({ queryKey: ['media'] }),
      ]);
    },
  });
}
