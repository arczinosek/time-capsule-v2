import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '~/components/ui/card';
import {
  emptyMilestoneFormValues,
  MilestoneForm,
} from '~/features/milestones/milestone-form';
import { useCreateMilestone } from '~/features/milestones/queries';

export const Route = createFileRoute('/milestones/new')({
  component: NewMilestonePage,
});

function NewMilestonePage() {
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
