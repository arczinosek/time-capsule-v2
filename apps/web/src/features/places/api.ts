import {
  placeDetailResponseSchema,
  placeResponseSchema,
  type CreatePlaceRequest,
  type PlaceDetailResponse,
  type PlaceResponse,
  type UpdatePlaceRequest,
} from '@time-capsule/shared';
import { apiRequest } from '~/lib/api-client';

// Fetchers for /places. Every response is parsed with the shared contract. The list has no
// milestones; the detail (also the answer to POST and PATCH) has the milestones on its location.

export async function listPlaces(): Promise<PlaceResponse[]> {
  return placeResponseSchema.array().parse(await apiRequest('GET', '/places'));
}

export async function getPlace(id: number): Promise<PlaceDetailResponse> {
  return placeDetailResponseSchema.parse(
    await apiRequest('GET', `/places/${id}`),
  );
}

export async function createPlace(
  request: CreatePlaceRequest,
): Promise<PlaceDetailResponse> {
  return placeDetailResponseSchema.parse(
    await apiRequest('POST', '/places', request),
  );
}

export async function updatePlace(
  id: number,
  request: UpdatePlaceRequest,
): Promise<PlaceDetailResponse> {
  return placeDetailResponseSchema.parse(
    await apiRequest('PATCH', `/places/${id}`, request),
  );
}

export async function deletePlace(id: number): Promise<void> {
  await apiRequest('DELETE', `/places/${id}`);
}
