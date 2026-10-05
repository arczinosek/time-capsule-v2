import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { IconAdd } from '~/components/icons/action-icons';
import { PageHeading } from '~/components/page-heading';
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
    <section className="mx-auto max-w-3xl space-y-6">
      <PageHeading
        title={t('familyMembers.title')}
        actions={
          <Button asChild>
            <Link to="/family-members/new">
              <IconAdd />
              {t('familyMembers.new')}
            </Link>
          </Button>
        }
      />
      <FamilyMemberList familyMembers={familyMembers} />
    </section>
  );
}
