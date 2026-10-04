import type { FamilyMemberSummary } from '@time-capsule/shared';
import { familyMembers, type FamilyMember } from '../database/schema.js';

// A family member as other rows embed them (parents, children, milestone participants):
// select these columns, map the rows with toFamilyMemberSummary.

export const familyMemberSummaryColumns = {
  id: familyMembers.id,
  name: familyMembers.name,
  kind: familyMembers.kind,
};

export type FamilyMemberSummaryRow = Pick<FamilyMember, 'id' | 'name' | 'kind'>;

export function toFamilyMemberSummary(
  row: FamilyMemberSummaryRow,
): FamilyMemberSummary {
  return { id: row.id, name: row.name, kind: row.kind };
}
