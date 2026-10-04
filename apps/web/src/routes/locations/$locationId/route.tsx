import { createFileRoute, notFound } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { NotFound } from '~/components/route-states';
import { locationQueries } from '~/features/locations/queries';
import { ApiError } from '~/lib/api-client';
import { toPositiveInt } from '~/lib/route-params';

// Layout for /locations/$locationId/*: owns the id, the detail loader and the not-found page,
// so the leaf routes only read the cache.
export const Route = createFileRoute('/locations/$locationId')({
  params: {
    parse: ({ locationId }) => {
      const id = toPositiveInt(locationId);
      return id === false ? false : { locationId: id };
    },
    stringify: ({ locationId }) => ({ locationId: String(locationId) }),
  },
  loader: async ({ context, params }) => {
    try {
      await context.queryClient.query(locationQueries.detail(params.locationId));
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) throw notFound();
      throw error;
    }
  },
  notFoundComponent: LocationNotFound,
});

function LocationNotFound() {
  const { t } = useTranslation();
  return (
    <NotFound
      message={t('locations.notFound')}
      to="/locations"
      label={t('locations.backToList')}
    />
  );
}
