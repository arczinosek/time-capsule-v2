import { createFileRoute, notFound } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { NotFound } from '~/components/route-states';
import { placeQueries } from '~/features/places/queries';
import { ApiError } from '~/lib/api-client';
import { toPositiveInt } from '~/lib/route-params';

// Layout for /places/$placeId/*: owns the id, the detail loader and the not-found page, so the
// leaf routes (index, edit) only read the cache.
export const Route = createFileRoute('/places/$placeId')({
  params: {
    parse: ({ placeId }) => {
      const id = toPositiveInt(placeId);
      return id === false ? false : { placeId: id };
    },
    stringify: ({ placeId }) => ({ placeId: String(placeId) }),
  },
  loader: async ({ context, params }) => {
    try {
      await context.queryClient.query(placeQueries.detail(params.placeId));
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) throw notFound();
      throw error;
    }
  },
  notFoundComponent: PlaceNotFound,
});

function PlaceNotFound() {
  const { t } = useTranslation();
  return (
    <NotFound
      message={t('places.notFound')}
      to="/places"
      label={t('places.backToList')}
    />
  );
}
