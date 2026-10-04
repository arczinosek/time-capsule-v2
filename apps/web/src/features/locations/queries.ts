import {
  queryOptions,
  useMutation,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import type { UpdateLocationRequest } from '@time-capsule/shared';
import {
  createLocation,
  deleteLocation,
  getLocation,
  listLocations,
  updateLocation,
} from './api';

// Every key starts with 'locations'. Places and milestones embed locations (and locations
// show their place), so every location write invalidates all three prefixes. Keys are imported
// one way only: places/queries imports locationsKey, so this file spells out their prefixes.
export const locationsKey = ['locations'] as const;

export const locationQueries = {
  list: () =>
    queryOptions({
      queryKey: [...locationsKey, 'list'],
      queryFn: listLocations,
    }),
  detail: (id: number) =>
    queryOptions({
      queryKey: [...locationsKey, 'detail', id],
      queryFn: () => getLocation(id),
    }),
};

function invalidateWhereQueries(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: locationsKey }),
    queryClient.invalidateQueries({ queryKey: ['places'] }),
    queryClient.invalidateQueries({ queryKey: ['milestones'] }),
  ]);
}

// Mutation hooks own cache updates; components own navigation. onSuccess RETURNS the
// invalidation promise, so the mutation stays pending until the cache is up to date (a form
// can select a new location as soon as mutateAsync resolves: the list already has it).

export function useCreateLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createLocation,
    onSuccess: () => invalidateWhereQueries(queryClient),
  });
}

export function useUpdateLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, request }: { id: number; request: UpdateLocationRequest }) =>
      updateLocation(id, request),
    onSuccess: (location) => {
      queryClient.setQueryData(
        locationQueries.detail(location.id).queryKey,
        location,
      );
      // Moved coordinates move the places and milestones on this location.
      return invalidateWhereQueries(queryClient);
    },
  });
}

export function useDeleteLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteLocation,
    onSuccess: (_data, id) => {
      queryClient.removeQueries({
        queryKey: locationQueries.detail(id).queryKey,
      });
      // Its place and milestones lose it.
      return invalidateWhereQueries(queryClient);
    },
  });
}
