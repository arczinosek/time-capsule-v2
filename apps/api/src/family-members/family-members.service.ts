import { Inject, Injectable } from '@nestjs/common';
import {
  deathAfterBirth,
  distinctParents,
  messages,
  type CreateFamilyMemberRequest,
  type MessageKey,
  type UpdateFamilyMemberRequest,
} from '@time-capsule/shared';
import { asc, eq, inArray, or } from 'drizzle-orm';
import { FieldValidationError } from '../common/field-validation.error.js';
import { NotFoundError } from '../common/not-found.error.js';
import {
  DRIZZLE,
  type Database,
  type Transaction,
} from '../database/database.types.js';
import {
  familyMembers,
  milestoneFamilyMembers,
  milestones,
  type FamilyMember,
} from '../database/schema.js';
import {
  milestoneSummaryColumns,
  type MilestoneSummaryRow,
} from '../milestones/milestone-summary.js';
import {
  familyMemberSummaryColumns,
  type FamilyMemberSummaryRow,
} from './family-member-summary.js';

export type FamilyMemberDetailRow = FamilyMember & {
  mother: FamilyMemberSummaryRow | null;
  father: FamilyMemberSummaryRow | null;
  children: FamilyMemberSummaryRow[];
  milestones: MilestoneSummaryRow[];
};

type ParentIds = Pick<UpdateFamilyMemberRequest, 'motherId' | 'fatherId'>;

// The shared refinements, run here against the stored row merged with a PATCH.
const [isDeathAfterBirth] = deathAfterBirth;
const [areParentsDistinct] = distinctParents;

@Injectable()
export class FamilyMembersService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  findAll(): Promise<FamilyMember[]> {
    return this.db
      .select()
      .from(familyMembers)
      .orderBy(asc(familyMembers.name), asc(familyMembers.id));
  }

  async findOne(id: number): Promise<FamilyMemberDetailRow> {
    const [familyMember] = await this.db
      .select()
      .from(familyMembers)
      .where(eq(familyMembers.id, id));

    if (!familyMember) {
      throw new NotFoundError(`Family member ${id} not found`);
    }

    const { motherId, fatherId } = familyMember;
    const parentIds = [motherId, fatherId].filter(
      (parentId) => parentId !== null,
    );
    const [parents, children, memberMilestones] = await Promise.all([
      parentIds.length === 0
        ? Promise.resolve([])
        : this.db
            .select(familyMemberSummaryColumns)
            .from(familyMembers)
            .where(inArray(familyMembers.id, parentIds)),
      this.db
        .select(familyMemberSummaryColumns)
        .from(familyMembers)
        .where(
          or(eq(familyMembers.motherId, id), eq(familyMembers.fatherId, id)),
        )
        .orderBy(
          asc(familyMembers.birthDate),
          asc(familyMembers.name),
          asc(familyMembers.id),
        ),
      this.db
        .select(milestoneSummaryColumns)
        .from(milestoneFamilyMembers)
        .innerJoin(
          milestones,
          eq(milestones.id, milestoneFamilyMembers.milestoneId),
        )
        .where(eq(milestoneFamilyMembers.familyMemberId, id))
        .orderBy(asc(milestones.date), asc(milestones.id)),
    ]);
    const parent = (parentId: number | null) =>
      parents.find((row) => row.id === parentId) ?? null;

    return {
      ...familyMember,
      mother: parent(motherId),
      father: parent(fatherId),
      children,
      milestones: memberMilestones,
    };
  }

  async create(
    request: CreateFamilyMemberRequest,
  ): Promise<FamilyMemberDetailRow> {
    const id = await this.db.transaction(async (tx) => {
      await this.assertParentsExist(tx, request);
      const [{ id }] = await tx
        .insert(familyMembers)
        .values(request)
        .$returningId();
      return id;
    });

    return this.findOne(id);
  }

  async update(
    id: number,
    request: UpdateFamilyMemberRequest,
  ): Promise<FamilyMemberDetailRow> {
    await this.db.transaction(async (tx) => {
      const [current] = await tx
        .select()
        .from(familyMembers)
        .where(eq(familyMembers.id, id))
        .for('update');

      if (!current) {
        throw new NotFoundError(`Family member ${id} not found`);
      }

      // A PATCH may change one side of a rule only: check what the row will hold.
      // undefined = not sent, keep the stored value; null = clear it.
      const merged = {
        birthDate:
          request.birthDate === undefined
            ? current.birthDate
            : request.birthDate,
        deathDate:
          request.deathDate === undefined
            ? current.deathDate
            : request.deathDate,
        motherId:
          request.motherId === undefined ? current.motherId : request.motherId,
        fatherId:
          request.fatherId === undefined ? current.fatherId : request.fatherId,
      };
      const fieldErrors: Partial<Record<string, MessageKey>> = {};

      if (merged.motherId === id) fieldErrors.motherId = messages.ownParent;
      if (merged.fatherId === id) fieldErrors.fatherId = messages.ownParent;
      if (!fieldErrors.fatherId && !areParentsDistinct(merged)) {
        fieldErrors.fatherId = messages.sameParents;
      }
      if (!isDeathAfterBirth(merged)) {
        fieldErrors.deathDate = messages.deathBeforeBirth;
      }
      if (Object.keys(fieldErrors).length > 0) {
        throw new FieldValidationError(fieldErrors);
      }

      // Only the parents this request sets; stored ones were checked when they were set.
      await this.assertParentsExist(tx, request);
      await tx
        .update(familyMembers)
        .set(request)
        .where(eq(familyMembers.id, id));
    });

    return this.findOne(id);
  }

  // Idempotent: deleting a missing family member is not an error, it just affects 0 rows.
  // The foreign keys clear the children's parent ids and remove the milestone links.
  async remove(id: number): Promise<number> {
    const [result] = await this.db
      .delete(familyMembers)
      .where(eq(familyMembers.id, id));

    return result.affectedRows;
  }

  /** Locks the parents FOR SHARE, so they can't be deleted before the transaction commits. */
  private async assertParentsExist(
    tx: Transaction,
    { motherId, fatherId }: ParentIds,
  ): Promise<void> {
    const parentIds = [motherId, fatherId].filter(
      (parentId) => parentId != null,
    );

    if (parentIds.length === 0) return;

    const found = await tx
      .select({ id: familyMembers.id })
      .from(familyMembers)
      .where(inArray(familyMembers.id, parentIds))
      .for('share');
    const exists = (parentId: number) =>
      found.some((row) => row.id === parentId);
    const fieldErrors: Partial<Record<string, MessageKey>> = {};

    if (motherId != null && !exists(motherId)) {
      fieldErrors.motherId = messages.familyMemberNotFound;
    }
    if (fatherId != null && !exists(fatherId)) {
      fieldErrors.fatherId = messages.familyMemberNotFound;
    }
    if (Object.keys(fieldErrors).length > 0) {
      throw new FieldValidationError(fieldErrors);
    }
  }
}
