import {
  milestoneResponseSchema,
  type CreateMilestoneRequest,
  type MilestoneResponse,
  type UpdateMilestoneRequest,
} from '@time-capsule/shared';
import { apiRequest } from '~/lib/api-client';

// Fetchers for /milestones. Every response is parsed with the shared contract, so api drift
// fails here with a zod error instead of surfacing as undefined fields in the UI.

export async function listMilestones(): Promise<MilestoneResponse[]> {
  return milestoneResponseSchema
    .array()
    .parse(await apiRequest('GET', '/milestones'));
}

export async function getMilestone(id: number): Promise<MilestoneResponse> {
  return milestoneResponseSchema.parse(
    await apiRequest('GET', `/milestones/${id}`),
  );
}

export async function createMilestone(
  request: CreateMilestoneRequest,
): Promise<MilestoneResponse> {
  return milestoneResponseSchema.parse(
    await apiRequest('POST', '/milestones', request),
  );
}

export async function updateMilestone(
  id: number,
  request: UpdateMilestoneRequest,
): Promise<MilestoneResponse> {
  return milestoneResponseSchema.parse(
    await apiRequest('PATCH', `/milestones/${id}`, request),
  );
}

export async function deleteMilestone(id: number): Promise<void> {
  await apiRequest('DELETE', `/milestones/${id}`);
}
