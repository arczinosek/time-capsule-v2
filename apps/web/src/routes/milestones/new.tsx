import { createFileRoute, useNavigate } from '@tanstack/react-router';
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
  return (
    <section className="space-y-6">
      <h1 className="text-xl font-semibold">New milestone</h1>
      <Card>
        <CardContent>
          <MilestoneForm
            defaultValues={emptyMilestoneFormValues}
            submitLabel="Create"
            onSubmit={async (values) => {
              await create.mutateAsync(values); // throws ApiError -> shown by the form
              await navigate({ to: '/milestones' });
            }}
          />
        </CardContent>
      </Card>
    </section>
  );
}
