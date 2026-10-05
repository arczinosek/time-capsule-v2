import { Link } from '@tanstack/react-router';
import type { FamilyMemberKind, FamilyMemberResponse } from '@time-capsule/shared';
import { useTranslation } from 'react-i18next';
import { familyMemberKindIcons } from './kind-icons';
import { LifeDates } from './life-dates';

function KindIcon({ kind }: { kind: FamilyMemberKind }) {
  const Icon = familyMemberKindIcons[kind];
  return <Icon className="size-4 text-brass-ink" />;
}

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
    <ul className="divide-y rounded-sm bg-card shadow-parchment ring-1 ring-border">
      {familyMembers.map((familyMember) => (
        <li key={familyMember.id} className="space-y-0.5 px-4 py-3">
          <Link
            to="/family-members/$familyMemberId"
            params={{ familyMemberId: familyMember.id }}
            className="font-medium underline-offset-4 hover:underline"
          >
            {familyMember.name}
          </Link>
          <p className="flex flex-wrap items-center gap-x-1.5 text-sm text-muted-foreground">
            <KindIcon kind={familyMember.kind} />
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
