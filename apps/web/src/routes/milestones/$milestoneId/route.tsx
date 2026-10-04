import { createFileRoute, notFound } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { NotFound } from '~/components/route-states';
import { milestoneQueries } from '~/features/milestones/queries';
import { ApiError } from '~/lib/api-client';
import { toPositiveInt } from '~/lib/route-params';

// Layout for /milestones/$milestoneId/*: owns the id, the detail loader and the not-found page,
// so the leaf routes (index, edit) only read the cache. No component: it renders <Outlet />.
export const Route = createFileRoute('/milestones/$milestoneId')({
  params: {
    // Only positive integers match: /milestones/abc falls through to the not-found page
    // instead of calling the api. Components and links get a number.
    parse: ({ milestoneId }) => {
      const id = toPositiveInt(milestoneId);
      return id === false ? false : { milestoneId: id };
    },
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
  notFoundComponent: MilestoneNotFound,
});

function MilestoneNotFound() {
  const { t } = useTranslation();
  return (
    <NotFound
      message={t('milestones.notFound')}
      to="/milestones"
      label={t('milestones.backToList')}
    />
  );
}
