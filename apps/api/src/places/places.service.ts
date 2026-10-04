import { Inject, Injectable } from '@nestjs/common';
import {
  messages,
  type CreatePlaceRequest,
  type UpdatePlaceRequest,
} from '@time-capsule/shared';
import { and, asc, eq, getTableColumns, ne } from 'drizzle-orm';
import { FieldValidationError } from '../common/field-validation.error.js';
import { NotFoundError } from '../common/not-found.error.js';
import {
  DRIZZLE,
  type Database,
  type Transaction,
} from '../database/database.types.js';
import {
  locations,
  milestones,
  places,
  type Place,
} from '../database/schema.js';
import {
  locationSummaryColumns,
  type LocationSummaryRow,
} from '../locations/location-summary.js';
import {
  milestoneSummaryColumns,
  type MilestoneSummaryRow,
} from '../milestones/milestone-summary.js';

/** A place with its location, if any. */
export type PlaceRow = Place & { location: LocationSummaryRow | null };

export type PlaceDetailRow = PlaceRow & {
  /** The milestones on the place's location, oldest first. */
  milestones: MilestoneSummaryRow[];
};

@Injectable()
export class PlacesService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  findAll(): Promise<PlaceRow[]> {
    return this.selectPlaces().orderBy(asc(places.name), asc(places.id));
  }

  async findOne(id: number): Promise<PlaceDetailRow> {
    const [place] = await this.selectPlaces().where(eq(places.id, id));

    if (!place) {
      throw new NotFoundError(`Place ${id} not found`);
    }

    const placeMilestones =
      place.locationId === null
        ? []
        : await this.db
            .select(milestoneSummaryColumns)
            .from(milestones)
            .where(eq(milestones.locationId, place.locationId))
            .orderBy(asc(milestones.date), asc(milestones.id));

    return { ...place, milestones: placeMilestones };
  }

  async create(request: CreatePlaceRequest): Promise<PlaceDetailRow> {
    const id = await this.db.transaction(async (tx) => {
      if (request.locationId != null) {
        await this.assertLocationAvailable(tx, request.locationId);
      }

      const [{ id }] = await tx.insert(places).values(request).$returningId();
      return id;
    });

    return this.findOne(id);
  }

  async update(
    id: number,
    request: UpdatePlaceRequest,
  ): Promise<PlaceDetailRow> {
    await this.db.transaction(async (tx) => {
      // Lock the place first, then (in assertLocationAvailable) the location.
      const [locked] = await tx
        .select({ id: places.id })
        .from(places)
        .where(eq(places.id, id))
        .for('update');

      if (!locked) {
        throw new NotFoundError(`Place ${id} not found`);
      }

      if (request.locationId != null) {
        await this.assertLocationAvailable(tx, request.locationId, id);
      }

      await tx.update(places).set(request).where(eq(places.id, id));
    });

    return this.findOne(id);
  }

  // Idempotent. The place's location and the milestones on it stay as they are.
  async remove(id: number): Promise<number> {
    const [result] = await this.db.delete(places).where(eq(places.id, id));

    return result.affectedRows;
  }

  /**
   * The location exists and no other place owns it. Locks the location FOR UPDATE, so two
   * place writes for the same location run one after the other and the second one sees the
   * first; the UNIQUE index is the last line of defence.
   */
  private async assertLocationAvailable(
    tx: Transaction,
    locationId: number,
    exceptPlaceId?: number,
  ): Promise<void> {
    const [location] = await tx
      .select({ id: locations.id })
      .from(locations)
      .where(eq(locations.id, locationId))
      .for('update');

    if (!location) {
      throw new FieldValidationError({ locationId: messages.locationNotFound });
    }

    const [owner] = await tx
      .select({ id: places.id })
      .from(places)
      .where(
        and(
          eq(places.locationId, locationId),
          exceptPlaceId === undefined
            ? undefined
            : ne(places.id, exceptPlaceId),
        ),
      );

    if (owner) {
      throw new FieldValidationError({ locationId: messages.locationTaken });
    }
  }

  private selectPlaces() {
    // `location` is a top-level key from one left-joined table: Drizzle answers null when the
    // place has no location.
    return this.db
      .select({ ...getTableColumns(places), location: locationSummaryColumns })
      .from(places)
      .leftJoin(locations, eq(locations.id, places.locationId))
      .$dynamic();
  }
}
