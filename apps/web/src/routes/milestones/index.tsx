import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { IconAdd } from '~/components/icons/action-icons';
import { PageHeading } from '~/components/page-heading';
import { Button } from '~/components/ui/button';
import { milestoneQueries } from '~/features/milestones/queries';
import { Timeline } from '~/features/milestones/timeline';

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
      <PageHeading
        title={t('timeline.title')}
        actions={
          <Button asChild>
            <Link to="/milestones/new">
              <IconAdd />
              {t('milestones.new')}
            </Link>
          </Button>
        }
      />
      <Timeline milestones={milestones} />
    </section>
  );
}
