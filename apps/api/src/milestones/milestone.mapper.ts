import type { MilestoneResponse } from '@time-capsule/shared';
import { toFamilyMemberSummary } from '../family-members/family-member-summary.js';
import { toLocationSummary } from '../locations/location-summary.js';
import { toPlaceSummary } from '../places/place-summary.js';
import type { MilestoneRow } from './milestones.service.js';

export function toMilestoneResponse(
  milestone: MilestoneRow,
): MilestoneResponse {
  return {
    id: milestone.id,
    date: milestone.date,
    title: milestone.title,
    description: milestone.description,
    category: milestone.category,
    familyMembers: milestone.familyMembers.map(toFamilyMemberSummary),
    location: milestone.location && toLocationSummary(milestone.location),
    place: milestone.place && toPlaceSummary(milestone.place),
    createdAt: milestone.createdAt.toISOString(),
    updatedAt: milestone.updatedAt.toISOString(),
  };
}
