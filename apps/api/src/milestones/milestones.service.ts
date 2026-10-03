import { Inject, Injectable } from '@nestjs/common';
import type {
  CreateMilestoneRequest,
  UpdateMilestoneRequest,
} from '@time-capsule/shared';
import { desc, eq } from 'drizzle-orm';
import { NotFoundError } from '../common/not-found.error.js';
import { DRIZZLE, type Database } from '../database/database.types.js';
import { milestones, type Milestone } from '../database/schema.js';

@Injectable()
export class MilestonesService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  // TODO: paging results
  findAll(): Promise<Milestone[]> {
    return this.db
      .select()
      .from(milestones)
      .orderBy(desc(milestones.date), desc(milestones.id));
  }

  async findOne(id: number): Promise<Milestone> {
    const [milestone] = await this.db
      .select()
      .from(milestones)
      .where(eq(milestones.id, id));

    if (!milestone) {
      throw new NotFoundError(`Milestone ${id} not found`);
    }

    return milestone;
  }

  async create(request: CreateMilestoneRequest): Promise<Milestone> {
    const [{ id }] = await this.db
      .insert(milestones)
      .values(request)
      .$returningId();

    return this.findOne(id);
  }

  async update(
    id: number,
    request: UpdateMilestoneRequest,
  ): Promise<Milestone> {
    await this.findOne(id);
    await this.db.update(milestones).set(request).where(eq(milestones.id, id));

    return this.findOne(id);
  }

  // Idempotent: deleting a missing milestone is not an error, it just affects 0 rows.
  async remove(id: number): Promise<number> {
    const [result] = await this.db
      .delete(milestones)
      .where(eq(milestones.id, id));

    return result.affectedRows;
  }
}
