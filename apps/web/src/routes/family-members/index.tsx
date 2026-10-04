import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Button } from '~/components/ui/button';
import { FamilyMemberList } from '~/features/family-members/family-member-list';
import { familyMemberQueries } from '~/features/family-members/queries';

export const Route = createFileRoute('/family-members/')({
  loader: async ({ context }) => {
    await context.queryClient.query(familyMemberQueries.list());
  },
  component: FamilyMembersPage,
});

function FamilyMembersPage() {
  const { data: familyMembers } = useSuspenseQuery(familyMemberQueries.list());
  const { t } = useTranslation();
  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t('familyMembers.title')}</h1>
        <Button asChild>
          <Link to="/family-members/new">{t('familyMembers.new')}</Link>
        </Button>
      </div>
      <FamilyMemberList familyMembers={familyMembers} />
    </section>
  );
}
