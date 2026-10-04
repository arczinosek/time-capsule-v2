import {
  queryOptions,
  useMutation,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import type { UpdatePlaceRequest } from '@time-capsule/shared';
import { locationsKey } from '~/features/locations/queries';
import {
  createPlace,
  deletePlace,
  getPlace,
  listPlaces,
  updatePlace,
} from './api';

// Every key starts with 'places'. Locations show their place and milestones derive theirs, so
// every place write invalidates all three prefixes. Milestone writes invalidate this prefix
// (a place's page lists the milestones on its location).
export const placesKey = ['places'] as const;

export const placeQueries = {
  list: () =>
    queryOptions({ queryKey: [...placesKey, 'list'], queryFn: listPlaces }),
  detail: (id: number) =>
    queryOptions({
      queryKey: [...placesKey, 'detail', id],
      queryFn: () => getPlace(id),
    }),
};

function invalidateWhereQueries(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: placesKey }),
    queryClient.invalidateQueries({ queryKey: locationsKey }),
    queryClient.invalidateQueries({ queryKey: ['milestones'] }),
  ]);
}

// Mutation hooks own cache updates; components own navigation. onSuccess RETURNS the
// invalidation promise, so the mutation stays pending until the cache is up to date.

export function useCreatePlace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPlace,
    onSuccess: () => invalidateWhereQueries(queryClient),
  });
}

export function useUpdatePlace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, request }: { id: number; request: UpdatePlaceRequest }) =>
      updatePlace(id, request),
    onSuccess: (place) => {
      queryClient.setQueryData(placeQueries.detail(place.id).queryKey, place);
      return invalidateWhereQueries(queryClient);
    },
  });
}

export function useDeletePlace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deletePlace,
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: placeQueries.detail(id).queryKey });
      return invalidateWhereQueries(queryClient);
    },
  });
}
