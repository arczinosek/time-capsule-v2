import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { MilestoneDetail } from '~/features/milestones/milestone-detail';
import { milestoneQueries } from '~/features/milestones/queries';

// The loader, params and not-found page live in ./route.tsx.
export const Route = createFileRoute('/milestones/$milestoneId/')({
  component: MilestonePage,
});

function MilestonePage() {
  const { milestoneId } = Route.useParams();
  const { data: milestone } = useSuspenseQuery(
    milestoneQueries.detail(milestoneId),
  );
  const navigate = useNavigate();
  return (
    <MilestoneDetail
      milestone={milestone}
      onDeleted={() => navigate({ to: '/milestones' })}
    />
  );
}
