import {
  milestoneResponseSchema,
  type MilestoneResponse,
} from '@time-capsule/shared';

let nextId = 1;

/** A valid api milestone. Parsed with the shared schema so fixtures can't drift from the contract. */
export function buildMilestone(
  overrides: Partial<MilestoneResponse> = {},
): MilestoneResponse {
  return milestoneResponseSchema.parse({
    id: nextId++,
    date: '2024-05-01',
    title: 'First steps',
    description: null,
    category: null,
    createdAt: '2024-05-01T10:00:00.000Z',
    updatedAt: '2024-05-01T10:00:00.000Z',
    ...overrides,
  });
}
