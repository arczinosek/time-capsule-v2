import { Link } from '@tanstack/react-router';
import type { FamilyMemberResponse } from '@time-capsule/shared';
import { useTranslation } from 'react-i18next';
import { LifeDates } from './life-dates';

export function FamilyMemberList({
  familyMembers,
}: {
  familyMembers: FamilyMemberResponse[];
}) {
  const { t } = useTranslation();

  if (familyMembers.length === 0) {
    return <p className="text-muted-foreground">{t('familyMembers.empty')}</p>;
  }
  return (
    <ul className="divide-y rounded-xl border">
      {familyMembers.map((familyMember) => (
        <li key={familyMember.id} className="space-y-0.5 px-4 py-3">
          <Link
            to="/family-members/$familyMemberId"
            params={{ familyMemberId: familyMember.id }}
            className="font-medium hover:underline"
          >
            {familyMember.name}
          </Link>
          <p className="text-sm text-muted-foreground">
            {t(`familyMemberKind.${familyMember.kind}`)}
            {(familyMember.birthDate || familyMember.deathDate) && ' · '}
            <LifeDates
              birthDate={familyMember.birthDate}
              deathDate={familyMember.deathDate}
            />
          </p>
        </li>
      ))}
    </ul>
  );
}
