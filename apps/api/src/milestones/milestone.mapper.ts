import type { MilestoneResponse } from '@time-capsule/shared';
import type { Milestone } from '../database/schema.js';

export function toMilestoneResponse(milestone: Milestone): MilestoneResponse {
  return {
    id: milestone.id,
    date: milestone.date,
    title: milestone.title,
    description: milestone.description,
    createdAt: milestone.createdAt.toISOString(),
    updatedAt: milestone.updatedAt.toISOString(),
  };
}
