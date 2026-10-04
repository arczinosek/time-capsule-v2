import { Inject, Injectable } from '@nestjs/common';
import {
  messages,
  type CreateMilestoneRequest,
  type UpdateMilestoneRequest,
} from '@time-capsule/shared';
import { asc, desc, eq, getTableColumns, inArray } from 'drizzle-orm';
import { FieldValidationError } from '../common/field-validation.error.js';
import { NotFoundError } from '../common/not-found.error.js';
import {
  DRIZZLE,
  type Database,
  type Transaction,
} from '../database/database.types.js';
import {
  familyMembers,
  locations,
  milestoneFamilyMembers,
  milestones,
  places,
  type Milestone,
} from '../database/schema.js';
import {
  familyMemberSummaryColumns,
  type FamilyMemberSummaryRow,
} from '../family-members/family-member-summary.js';
import {
  locationSummaryColumns,
  type LocationSummaryRow,
} from '../locations/location-summary.js';
import {
  placeSummaryColumns,
  type PlaceSummaryRow,
} from '../places/place-summary.js';

/** A milestone with what its response embeds. Later features add their relations here. */
export type MilestoneRow = Milestone & {
  /** Sorted by name. */
  familyMembers: FamilyMemberSummaryRow[];
  location: LocationSummaryRow | null;
  /** Derived: the place that owns the location. */
  place: PlaceSummaryRow | null;
};

/** What one query reads; the participants are attached by a second, batched one. */
type MilestoneJoinedRow = Omit<MilestoneRow, 'familyMembers'>;

@Injectable()
export class MilestonesService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  // TODO: paging results
  async findAll(): Promise<MilestoneRow[]> {
    const rows = await this.selectMilestones().orderBy(
      desc(milestones.date),
      desc(milestones.id),
    );

    return this.withRelations(rows);
  }

  async findOne(id: number): Promise<MilestoneRow> {
    const [milestone] = await this.selectMilestones().where(
      eq(milestones.id, id),
    );

    if (!milestone) {
      throw new NotFoundError(`Milestone ${id} not found`);
    }

    const [row] = await this.withRelations([milestone]);
    return row;
  }

  async create(request: CreateMilestoneRequest): Promise<MilestoneRow> {
    // Relation keys aren't columns: keep them out of values().
    const { familyMemberIds, ...columns } = request;
    const id = await this.db.transaction(async (tx) => {
      if (columns.locationId != null) {
        await this.assertLocationExists(tx, columns.locationId);
      }

      const [{ id }] = await tx
        .insert(milestones)
        .values(columns)
        .$returningId();

      if (familyMemberIds !== undefined) {
        await this.replaceFamilyMembers(tx, id, familyMemberIds);
      }

      return id;
    });

    return this.findOne(id);
  }

  async update(
    id: number,
    request: UpdateMilestoneRequest,
  ): Promise<MilestoneRow> {
    const { familyMemberIds, ...columns } = request;

    await this.db.transaction(async (tx) => {
      // Lock the milestone first, then (in replaceFamilyMembers) the rows it references.
      const [locked] = await tx
        .select({ id: milestones.id })
        .from(milestones)
        .where(eq(milestones.id, id))
        .for('update');

      if (!locked) {
        throw new NotFoundError(`Milestone ${id} not found`);
      }

      if (columns.locationId != null) {
        await this.assertLocationExists(tx, columns.locationId);
      }

      // A PATCH of relations only has no columns, and Drizzle throws on an empty set().
      if (Object.keys(columns).length > 0) {
        await tx.update(milestones).set(columns).where(eq(milestones.id, id));
      }

      if (familyMemberIds !== undefined) {
        await this.replaceFamilyMembers(tx, id, familyMemberIds);
      }
    });

    return this.findOne(id);
  }

  // Idempotent: deleting a missing milestone is not an error, it just affects 0 rows.
  // The foreign keys remove its participant links.
  async remove(id: number): Promise<number> {
    const [result] = await this.db
      .delete(milestones)
      .where(eq(milestones.id, id));

    return result.affectedRows;
  }

  private selectMilestones() {
    // `location` and `place` are top-level keys, each from one left-joined table, so Drizzle
    // answers null for them when nothing joined. Both joins are 1:1: places.location_id is
    // UNIQUE, and a NULL location_id matches no place.
    return this.db
      .select({
        ...getTableColumns(milestones),
        location: locationSummaryColumns,
        place: placeSummaryColumns,
      })
      .from(milestones)
      .leftJoin(locations, eq(locations.id, milestones.locationId))
      .leftJoin(places, eq(places.locationId, milestones.locationId))
      .$dynamic();
  }

  /** Attaches the participants of every row with one query. */
  private async withRelations(
    rows: MilestoneJoinedRow[],
  ): Promise<MilestoneRow[]> {
    if (rows.length === 0) return [];

    const links = await this.db
      .select({
        milestoneId: milestoneFamilyMembers.milestoneId,
        ...familyMemberSummaryColumns,
      })
      .from(milestoneFamilyMembers)
      .innerJoin(
        familyMembers,
        eq(familyMembers.id, milestoneFamilyMembers.familyMemberId),
      )
      .where(
        inArray(
          milestoneFamilyMembers.milestoneId,
          rows.map((row) => row.id),
        ),
      )
      .orderBy(asc(familyMembers.name), asc(familyMembers.id));
    const byMilestone = new Map<number, FamilyMemberSummaryRow[]>();

    for (const { milestoneId, ...familyMember } of links) {
      byMilestone.set(milestoneId, [
        ...(byMilestone.get(milestoneId) ?? []),
        familyMember,
      ]);
    }

    return rows.map((row) => ({
      ...row,
      familyMembers: byMilestone.get(row.id) ?? [],
    }));
  }

  /** Locks the location FOR SHARE, so it can't be deleted before the transaction commits. */
  private async assertLocationExists(
    tx: Transaction,
    locationId: number,
  ): Promise<void> {
    const [location] = await tx
      .select({ id: locations.id })
      .from(locations)
      .where(eq(locations.id, locationId))
      .for('share');

    if (!location) {
      throw new FieldValidationError({ locationId: messages.locationNotFound });
    }
  }

  /**
   * Replaces the participant set. Locks the family members FOR SHARE, so none can be deleted
   * before the transaction commits; an unknown id throws, which rolls the transaction back.
   */
  private async replaceFamilyMembers(
    tx: Transaction,
    milestoneId: number,
    familyMemberIds: number[],
  ): Promise<void> {
    const ids = [...new Set(familyMemberIds)];

    if (ids.length > 0) {
      const found = await tx
        .select({ id: familyMembers.id })
        .from(familyMembers)
        .where(inArray(familyMembers.id, ids))
        .for('share');

      if (found.length !== ids.length) {
        throw new FieldValidationError({
          familyMemberIds: messages.familyMemberNotFound,
        });
      }
    }

    await tx
      .delete(milestoneFamilyMembers)
      .where(eq(milestoneFamilyMembers.milestoneId, milestoneId));

    // insert().values([]) throws: nothing to insert when the set was cleared.
    if (ids.length > 0) {
      await tx
        .insert(milestoneFamilyMembers)
        .values(ids.map((familyMemberId) => ({ milestoneId, familyMemberId })));
    }
  }
}
