import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Button } from '~/components/ui/button';
import { MilestoneList } from '~/features/milestones/milestone-list';
import { milestoneQueries } from '~/features/milestones/queries';

export const Route = createFileRoute('/milestones/')({
  // Loaders only warm the cache; components read it with useSuspenseQuery.
  // query(), not the deprecated ensureQueryData: with the default staleTime (0) every visit
  // waits for a fresh list, so a just-created, edited or deleted milestone is always correct.
  loader: async ({ context }) => {
    await context.queryClient.query(milestoneQueries.list());
  },
  component: MilestonesPage,
});

function MilestonesPage() {
  const { data: milestones } = useSuspenseQuery(milestoneQueries.list());
  const { t } = useTranslation();
  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t('milestones.title')}</h1>
        <Button asChild>
          <Link to="/milestones/new">{t('milestones.new')}</Link>
        </Button>
      </div>
      <MilestoneList milestones={milestones} />
    </section>
  );
}
