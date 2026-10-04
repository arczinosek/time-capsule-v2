import { Inject, Injectable } from '@nestjs/common';
import type {
  CreateLocationRequest,
  UpdateLocationRequest,
} from '@time-capsule/shared';
import { asc, eq, getTableColumns } from 'drizzle-orm';
import { NotFoundError } from '../common/not-found.error.js';
import { DRIZZLE, type Database } from '../database/database.types.js';
import { locations, places, type Location } from '../database/schema.js';
import {
  placeSummaryColumns,
  type PlaceSummaryRow,
} from '../places/place-summary.js';

/** A location with the place that owns it, if any. */
export type LocationRow = Location & { place: PlaceSummaryRow | null };

@Injectable()
export class LocationsService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  findAll(): Promise<LocationRow[]> {
    return this.selectLocations().orderBy(
      asc(locations.name),
      asc(locations.id),
    );
  }

  async findOne(id: number): Promise<LocationRow> {
    const [location] = await this.selectLocations().where(eq(locations.id, id));

    if (!location) {
      throw new NotFoundError(`Location ${id} not found`);
    }

    return location;
  }

  async create(request: CreateLocationRequest): Promise<LocationRow> {
    const [{ id }] = await this.db
      .insert(locations)
      .values(request)
      .$returningId();

    return this.findOne(id);
  }

  async update(
    id: number,
    request: UpdateLocationRequest,
  ): Promise<LocationRow> {
    // The schema guarantees at least one column. A missing row updates nothing, and
    // findOne answers 404.
    await this.db.update(locations).set(request).where(eq(locations.id, id));

    return this.findOne(id);
  }

  // Idempotent, and always allowed: the foreign keys clear the location of its place and of
  // its milestones.
  async remove(id: number): Promise<number> {
    const [result] = await this.db
      .delete(locations)
      .where(eq(locations.id, id));

    return result.affectedRows;
  }

  private selectLocations() {
    // `place` is a top-level key from one left-joined table: Drizzle answers null when the
    // location has no place. places.location_id is UNIQUE, so the join is 1:1.
    return this.db
      .select({ ...getTableColumns(locations), place: placeSummaryColumns })
      .from(locations)
      .leftJoin(places, eq(places.locationId, locations.id))
      .$dynamic();
  }
}
