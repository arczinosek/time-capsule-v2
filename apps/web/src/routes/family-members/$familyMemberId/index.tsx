import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { FamilyMemberDetail } from '~/features/family-members/family-member-detail';
import { familyMemberQueries } from '~/features/family-members/queries';

// The loader, params and not-found page live in ./route.tsx.
export const Route = createFileRoute('/family-members/$familyMemberId/')({
  component: FamilyMemberPage,
});

function FamilyMemberPage() {
  const { familyMemberId } = Route.useParams();
  const { data: familyMember } = useSuspenseQuery(
    familyMemberQueries.detail(familyMemberId),
  );
  const navigate = useNavigate();
  return (
    <FamilyMemberDetail
      familyMember={familyMember}
      onDeleted={() => navigate({ to: '/family-members' })}
    />
  );
}
