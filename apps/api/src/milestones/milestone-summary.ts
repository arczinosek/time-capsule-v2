import type { MilestoneSummary } from '@time-capsule/shared';
import { milestones, type Milestone } from '../database/schema.js';

// A milestone as other features embed it (e.g. a family member's detail): select these
// columns, map the rows with toMilestoneSummary.

export const milestoneSummaryColumns = {
  id: milestones.id,
  date: milestones.date,
  title: milestones.title,
  category: milestones.category,
};

export type MilestoneSummaryRow = Pick<
  Milestone,
  'id' | 'date' | 'title' | 'category'
>;

export function toMilestoneSummary(row: MilestoneSummaryRow): MilestoneSummary {
  return {
    id: row.id,
    date: row.date,
    title: row.title,
    category: row.category,
  };
}
