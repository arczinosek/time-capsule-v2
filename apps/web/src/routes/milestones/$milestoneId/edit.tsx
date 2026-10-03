import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, notFound, useNavigate } from '@tanstack/react-router';
import { NotFound } from '~/components/route-states';
import { Card, CardContent } from '~/components/ui/card';
import {
  MilestoneForm,
  toMilestoneFormValues,
} from '~/features/milestones/milestone-form';
import {
  milestoneQueries,
  useUpdateMilestone,
} from '~/features/milestones/queries';
import { ApiError } from '~/lib/api-client';

export const Route = createFileRoute('/milestones/$milestoneId/edit')({
  params: {
    // Only positive integers match: /milestones/abc/edit falls through to the not-found page
    // instead of calling the api. Components and links get a number.
    parse: ({ milestoneId }) =>
      /^[1-9]\d*$/.test(milestoneId)
        ? { milestoneId: Number(milestoneId) }
        : false,
    stringify: ({ milestoneId }) => ({ milestoneId: String(milestoneId) }),
  },
  loader: async ({ context, params }) => {
    try {
      await context.queryClient.query(
        milestoneQueries.detail(params.milestoneId),
      );
    } catch (error) {
      // The api's 404 is an expected outcome: render this route's notFoundComponent.
      if (error instanceof ApiError && error.status === 404) throw notFound();
      throw error;
    }
  },
  notFoundComponent: () => <NotFound message="Milestone not found." />,
  component: EditMilestonePage,
});

function EditMilestonePage() {
  const { milestoneId } = Route.useParams();
  const { data: milestone } = useSuspenseQuery(
    milestoneQueries.detail(milestoneId),
  );
  const update = useUpdateMilestone();
  const navigate = useNavigate();
  return (
    <section className="space-y-6">
      <h1 className="text-xl font-semibold">Edit milestone</h1>
      <Card>
        <CardContent>
          <MilestoneForm
            // The router reuses this component across ids and RHF reads defaultValues once.
            key={milestone.id}
            defaultValues={toMilestoneFormValues(milestone)}
            submitLabel="Save"
            onSubmit={async (values) => {
              await update.mutateAsync({ id: milestone.id, request: values });
              await navigate({ to: '/milestones' });
            }}
          />
        </CardContent>
      </Card>
    </section>
  );
}
