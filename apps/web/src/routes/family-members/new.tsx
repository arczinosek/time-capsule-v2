import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '~/components/ui/card';
import {
  emptyFamilyMemberFormValues,
  FamilyMemberForm,
} from '~/features/family-members/family-member-form';
import {
  familyMemberQueries,
  useCreateFamilyMember,
} from '~/features/family-members/queries';

export const Route = createFileRoute('/family-members/new')({
  // The parent options.
  loader: async ({ context }) => {
    await context.queryClient.query(familyMemberQueries.list());
  },
  component: NewFamilyMemberPage,
});

function NewFamilyMemberPage() {
  const { data: familyMembers } = useSuspenseQuery(familyMemberQueries.list());
  const create = useCreateFamilyMember();
  const navigate = useNavigate();
  const { t } = useTranslation();
  return (
    <section className="space-y-6">
      <h1 className="text-xl font-semibold">{t('familyMembers.new')}</h1>
      <Card>
        <CardContent>
          <FamilyMemberForm
            defaultValues={emptyFamilyMemberFormValues}
            familyMembers={familyMembers}
            submitLabel={t('common.create')}
            onSubmit={async (values) => {
              const created = await create.mutateAsync(values); // throws ApiError -> shown by the form
              await navigate({
                to: '/family-members/$familyMemberId',
                params: { familyMemberId: created.id },
              });
            }}
          />
        </CardContent>
      </Card>
    </section>
  );
}
