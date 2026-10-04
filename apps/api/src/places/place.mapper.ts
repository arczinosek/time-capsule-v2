import type { PlaceDetailResponse, PlaceResponse } from '@time-capsule/shared';
import { toLocationSummary } from '../locations/location-summary.js';
import { toMilestoneSummary } from '../milestones/milestone-summary.js';
import type { PlaceDetailRow, PlaceRow } from './places.service.js';

export function toPlaceResponse(place: PlaceRow): PlaceResponse {
  return {
    id: place.id,
    name: place.name,
    description: place.description,
    location: place.location && toLocationSummary(place.location),
    createdAt: place.createdAt.toISOString(),
    updatedAt: place.updatedAt.toISOString(),
  };
}

export function toPlaceDetailResponse(
  place: PlaceDetailRow,
): PlaceDetailResponse {
  return {
    ...toPlaceResponse(place),
    milestones: place.milestones.map(toMilestoneSummary),
  };
}
