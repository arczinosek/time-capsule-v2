import type { PlaceSummary } from '@time-capsule/shared';
import { places, type Place } from '../database/schema.js';

// A place as other rows embed it (a location's owner, a milestone's derived place): select
// these columns, map the rows with toPlaceSummary.

export const placeSummaryColumns = {
  id: places.id,
  name: places.name,
};

export type PlaceSummaryRow = Pick<Place, 'id' | 'name'>;

export function toPlaceSummary(row: PlaceSummaryRow): PlaceSummary {
  return { id: row.id, name: row.name };
}
