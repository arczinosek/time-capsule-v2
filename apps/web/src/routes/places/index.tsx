import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Button } from '~/components/ui/button';
import { PlaceList } from '~/features/places/place-list';
import { PlacesSubnav } from '~/features/places/places-subnav';
import { placeQueries } from '~/features/places/queries';

export const Route = createFileRoute('/places/')({
  loader: async ({ context }) => {
    await context.queryClient.query(placeQueries.list());
  },
  component: PlacesPage,
});

function PlacesPage() {
  const { data: places } = useSuspenseQuery(placeQueries.list());
  const { t } = useTranslation();
  return (
    <section className="space-y-6">
      <PlacesSubnav />
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t('places.title')}</h1>
        <Button asChild>
          <Link to="/places/new">{t('places.new')}</Link>
        </Button>
      </div>
      <PlaceList places={places} />
    </section>
  );
}
