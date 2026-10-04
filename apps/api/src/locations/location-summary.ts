import type { LocationSummary } from '@time-capsule/shared';
import { locations, type Location } from '../database/schema.js';

// A location as other rows embed it (a place's location, a milestone's location): select these
// columns, map the rows with toLocationSummary.

export const locationSummaryColumns = {
  id: locations.id,
  name: locations.name,
  latitude: locations.latitude,
  longitude: locations.longitude,
};

export type LocationSummaryRow = Pick<
  Location,
  'id' | 'name' | 'latitude' | 'longitude'
>;

export function toLocationSummary(row: LocationSummaryRow): LocationSummary {
  return {
    id: row.id,
    name: row.name,
    latitude: row.latitude,
    longitude: row.longitude,
  };
}
