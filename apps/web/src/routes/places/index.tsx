import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { IconAdd } from '~/components/icons/action-icons';
import { PageHeading } from '~/components/page-heading';
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
    <section className="mx-auto max-w-3xl space-y-6">
      <PlacesSubnav />
      <PageHeading
        title={t('places.title')}
        actions={
          <Button asChild>
            <Link to="/places/new">
              <IconAdd />
              {t('places.new')}
            </Link>
          </Button>
        }
      />
      <PlaceList places={places} />
    </section>
  );
}
