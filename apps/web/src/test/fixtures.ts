import {
  familyMemberDetailResponseSchema,
  familyMemberResponseSchema,
  milestoneResponseSchema,
  type FamilyMemberDetailResponse,
  type FamilyMemberResponse,
  type MilestoneResponse,
} from '@time-capsule/shared';

// Fixtures are parsed with the shared schemas, so they can't drift from the contract.

let nextId = 1;

/** A valid api milestone. */
export function buildMilestone(
  overrides: Partial<MilestoneResponse> = {},
): MilestoneResponse {
  return milestoneResponseSchema.parse({
    id: nextId++,
    date: '2024-05-01',
    title: 'First steps',
    description: null,
    category: null,
    familyMembers: [],
    createdAt: '2024-05-01T10:00:00.000Z',
    updatedAt: '2024-05-01T10:00:00.000Z',
    ...overrides,
  });
}

/** A family member as the list (GET /family-members) returns them. */
export function buildFamilyMember(
  overrides: Partial<FamilyMemberResponse> = {},
): FamilyMemberResponse {
  return familyMemberResponseSchema.parse({
    id: nextId++,
    name: 'Ada',
    kind: 'human',
    description: null,
    birthDate: null,
    deathDate: null,
    motherId: null,
    fatherId: null,
    createdAt: '2024-05-01T10:00:00.000Z',
    updatedAt: '2024-05-01T10:00:00.000Z',
    ...overrides,
  });
}

/** A family member as GET /family-members/:id (and POST, PATCH) returns them. */
export function buildFamilyMemberDetail(
  overrides: Partial<FamilyMemberDetailResponse> = {},
): FamilyMemberDetailResponse {
  return familyMemberDetailResponseSchema.parse({
    ...buildFamilyMember(),
    mother: null,
    father: null,
    children: [],
    milestones: [],
    ...overrides,
  });
}
