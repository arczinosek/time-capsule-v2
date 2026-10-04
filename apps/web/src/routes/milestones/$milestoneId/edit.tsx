import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '~/components/ui/card';
import { familyMemberQueries } from '~/features/family-members/queries';
import { locationQueries } from '~/features/locations/queries';
import {
  MilestoneForm,
  toMilestoneFormValues,
} from '~/features/milestones/milestone-form';
import {
  milestoneQueries,
  useUpdateMilestone,
} from '~/features/milestones/queries';
import { placeQueries } from '~/features/places/queries';

// The detail loader, params and not-found page live in ./route.tsx.
export const Route = createFileRoute('/milestones/$milestoneId/edit')({
  // The participant and "where" options.
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.query(familyMemberQueries.list()),
      context.queryClient.query(locationQueries.list()),
      context.queryClient.query(placeQueries.list()),
    ]);
  },
  component: EditMilestonePage,
});

function EditMilestonePage() {
  const { milestoneId } = Route.useParams();
  const { data: milestone } = useSuspenseQuery(
    milestoneQueries.detail(milestoneId),
  );
  const { data: familyMembers } = useSuspenseQuery(familyMemberQueries.list());
  const { data: locations } = useSuspenseQuery(locationQueries.list());
  const { data: places } = useSuspenseQuery(placeQueries.list());
  const update = useUpdateMilestone();
  const navigate = useNavigate();
  const { t } = useTranslation();
  return (
    <section className="space-y-6">
      <h1 className="text-xl font-semibold">{t('milestones.edit')}</h1>
      <Card>
        <CardContent>
          <MilestoneForm
            // The router reuses this component across ids and RHF reads defaultValues once.
            key={milestone.id}
            defaultValues={toMilestoneFormValues(milestone)}
            familyMembers={familyMembers}
            places={places}
            locations={locations}
            submitLabel={t('common.save')}
            milestoneId={milestone.id}
            onSubmit={async (values) => {
              await update.mutateAsync({ id: milestone.id, request: values });
              await navigate({
                to: '/milestones/$milestoneId',
                params: { milestoneId: milestone.id },
              });
            }}
          />
        </CardContent>
      </Card>
    </section>
  );
}
