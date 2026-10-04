import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '~/components/ui/card';
import {
  FamilyMemberForm,
  toFamilyMemberFormValues,
} from '~/features/family-members/family-member-form';
import {
  familyMemberQueries,
  useUpdateFamilyMember,
} from '~/features/family-members/queries';

// The detail loader, params and not-found page live in ./route.tsx.
export const Route = createFileRoute('/family-members/$familyMemberId/edit')({
  // The parent options.
  loader: async ({ context }) => {
    await context.queryClient.query(familyMemberQueries.list());
  },
  component: EditFamilyMemberPage,
});

function EditFamilyMemberPage() {
  const { familyMemberId } = Route.useParams();
  const { data: familyMember } = useSuspenseQuery(
    familyMemberQueries.detail(familyMemberId),
  );
  const { data: familyMembers } = useSuspenseQuery(familyMemberQueries.list());
  const update = useUpdateFamilyMember();
  const navigate = useNavigate();
  const { t } = useTranslation();
  return (
    <section className="space-y-6">
      <h1 className="text-xl font-semibold">{t('familyMembers.edit')}</h1>
      <Card>
        <CardContent>
          <FamilyMemberForm
            // The router reuses this component across ids and RHF reads defaultValues once.
            key={familyMember.id}
            defaultValues={toFamilyMemberFormValues(familyMember)}
            familyMembers={familyMembers}
            submitLabel={t('common.save')}
            familyMemberId={familyMember.id}
            onSubmit={async (values) => {
              await update.mutateAsync({ id: familyMember.id, request: values });
              await navigate({
                to: '/family-members/$familyMemberId',
                params: { familyMemberId: familyMember.id },
              });
            }}
          />
        </CardContent>
      </Card>
    </section>
  );
}
