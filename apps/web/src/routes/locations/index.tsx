import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Button } from '~/components/ui/button';
import { LocationList } from '~/features/locations/location-list';
import { locationQueries } from '~/features/locations/queries';
import { PlacesSubnav } from '~/features/places/places-subnav';

export const Route = createFileRoute('/locations/')({
  loader: async ({ context }) => {
    await context.queryClient.query(locationQueries.list());
  },
  component: LocationsPage,
});

function LocationsPage() {
  const { data: locations } = useSuspenseQuery(locationQueries.list());
  const { t } = useTranslation();
  return (
    <section className="space-y-6">
      <PlacesSubnav />
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t('locations.title')}</h1>
        <Button asChild>
          <Link to="/locations/new">{t('locations.new')}</Link>
        </Button>
      </div>
      <LocationList locations={locations} />
    </section>
  );
}
