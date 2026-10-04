import {
  familyMemberDetailResponseSchema,
  familyMemberResponseSchema,
  type CreateFamilyMemberRequest,
  type FamilyMemberDetailResponse,
  type FamilyMemberResponse,
  type UpdateFamilyMemberRequest,
} from '@time-capsule/shared';
import { apiRequest } from '~/lib/api-client';

// Fetchers for /family-members. Every response is parsed with the shared contract. The list
// has no relations; the detail (also the answer to POST and PATCH) has parents, children and
// milestones.

export async function listFamilyMembers(): Promise<FamilyMemberResponse[]> {
  return familyMemberResponseSchema
    .array()
    .parse(await apiRequest('GET', '/family-members'));
}

export async function getFamilyMember(
  id: number,
): Promise<FamilyMemberDetailResponse> {
  return familyMemberDetailResponseSchema.parse(
    await apiRequest('GET', `/family-members/${id}`),
  );
}

export async function createFamilyMember(
  request: CreateFamilyMemberRequest,
): Promise<FamilyMemberDetailResponse> {
  return familyMemberDetailResponseSchema.parse(
    await apiRequest('POST', '/family-members', request),
  );
}

export async function updateFamilyMember(
  id: number,
  request: UpdateFamilyMemberRequest,
): Promise<FamilyMemberDetailResponse> {
  return familyMemberDetailResponseSchema.parse(
    await apiRequest('PATCH', `/family-members/${id}`, request),
  );
}

export async function deleteFamilyMember(id: number): Promise<void> {
  await apiRequest('DELETE', `/family-members/${id}`);
}
