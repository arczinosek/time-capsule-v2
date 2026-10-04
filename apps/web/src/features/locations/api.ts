import {
  locationResponseSchema,
  type CreateLocationRequest,
  type LocationResponse,
  type UpdateLocationRequest,
} from '@time-capsule/shared';
import { apiRequest } from '~/lib/api-client';

// Fetchers for /locations. Every response is parsed with the shared contract.

export async function listLocations(): Promise<LocationResponse[]> {
  return locationResponseSchema
    .array()
    .parse(await apiRequest('GET', '/locations'));
}

export async function getLocation(id: number): Promise<LocationResponse> {
  return locationResponseSchema.parse(
    await apiRequest('GET', `/locations/${id}`),
  );
}

export async function createLocation(
  request: CreateLocationRequest,
): Promise<LocationResponse> {
  return locationResponseSchema.parse(
    await apiRequest('POST', '/locations', request),
  );
}

export async function updateLocation(
  id: number,
  request: UpdateLocationRequest,
): Promise<LocationResponse> {
  return locationResponseSchema.parse(
    await apiRequest('PATCH', `/locations/${id}`, request),
  );
}

export async function deleteLocation(id: number): Promise<void> {
  await apiRequest('DELETE', `/locations/${id}`);
}
