import type {
  FamilyMemberDetailResponse,
  FamilyMemberResponse,
} from '@time-capsule/shared';
import type { FamilyMember } from '../database/schema.js';
import { toMediaResponse } from '../media/media.mapper.js';
import { toMilestoneSummary } from '../milestones/milestone-summary.js';
import { toFamilyMemberSummary } from './family-member-summary.js';
import type { FamilyMemberDetailRow } from './family-members.service.js';

export function toFamilyMemberResponse(
  familyMember: FamilyMember,
): FamilyMemberResponse {
  return {
    id: familyMember.id,
    name: familyMember.name,
    kind: familyMember.kind,
    description: familyMember.description,
    birthDate: familyMember.birthDate,
    deathDate: familyMember.deathDate,
    motherId: familyMember.motherId,
    fatherId: familyMember.fatherId,
    createdAt: familyMember.createdAt.toISOString(),
    updatedAt: familyMember.updatedAt.toISOString(),
  };
}

export function toFamilyMemberDetailResponse(
  familyMember: FamilyMemberDetailRow,
): FamilyMemberDetailResponse {
  return {
    ...toFamilyMemberResponse(familyMember),
    mother: familyMember.mother && toFamilyMemberSummary(familyMember.mother),
    father: familyMember.father && toFamilyMemberSummary(familyMember.father),
    children: familyMember.children.map(toFamilyMemberSummary),
    milestones: familyMember.milestones.map(toMilestoneSummary),
    media: familyMember.media.map(toMediaResponse),
  };
}
