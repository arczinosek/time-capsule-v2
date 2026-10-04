import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '~/components/ui/card';
import { familyMemberQueries } from '~/features/family-members/queries';
import { locationQueries } from '~/features/locations/queries';
import {
  emptyMilestoneFormValues,
  MilestoneForm,
} from '~/features/milestones/milestone-form';
import { useCreateMilestone } from '~/features/milestones/queries';
import { placeQueries } from '~/features/places/queries';

export const Route = createFileRoute('/milestones/new')({
  // The participant and "where" options.
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.query(familyMemberQueries.list()),
      context.queryClient.query(locationQueries.list()),
      context.queryClient.query(placeQueries.list()),
    ]);
  },
  component: NewMilestonePage,
});

function NewMilestonePage() {
  const { data: familyMembers } = useSuspenseQuery(familyMemberQueries.list());
  const { data: locations } = useSuspenseQuery(locationQueries.list());
  const { data: places } = useSuspenseQuery(placeQueries.list());
  const create = useCreateMilestone();
  const navigate = useNavigate();
  const { t } = useTranslation();
  return (
    <section className="space-y-6">
      <h1 className="text-xl font-semibold">{t('milestones.new')}</h1>
      <Card>
        <CardContent>
          <MilestoneForm
            defaultValues={emptyMilestoneFormValues}
            familyMembers={familyMembers}
            places={places}
            locations={locations}
            submitLabel={t('common.create')}
            onSubmit={async (values) => {
              const created = await create.mutateAsync(values); // throws ApiError -> shown by the form
              await navigate({
                to: '/milestones/$milestoneId',
                params: { milestoneId: created.id },
              });
            }}
          />
        </CardContent>
      </Card>
    </section>
  );
}
