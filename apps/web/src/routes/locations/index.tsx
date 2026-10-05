import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { IconAdd } from '~/components/icons/action-icons';
import { PageHeading } from '~/components/page-heading';
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
    <section className="mx-auto max-w-3xl space-y-6">
      <PlacesSubnav />
      <PageHeading
        title={t('locations.title')}
        actions={
          <Button asChild>
            <Link to="/locations/new">
              <IconAdd />
              {t('locations.new')}
            </Link>
          </Button>
        }
      />
      <LocationList locations={locations} />
    </section>
  );
}
