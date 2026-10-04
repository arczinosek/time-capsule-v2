import type { LocationResponse } from '@time-capsule/shared';
import { toPlaceSummary } from '../places/place-summary.js';
import type { LocationRow } from './locations.service.js';

export function toLocationResponse(location: LocationRow): LocationResponse {
  return {
    id: location.id,
    name: location.name,
    latitude: location.latitude,
    longitude: location.longitude,
    place: location.place && toPlaceSummary(location.place),
    createdAt: location.createdAt.toISOString(),
    updatedAt: location.updatedAt.toISOString(),
  };
}
