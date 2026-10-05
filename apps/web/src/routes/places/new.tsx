import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { PageHeading } from '~/components/page-heading';
import { Card, CardContent } from '~/components/ui/card';
import { locationQueries } from '~/features/locations/queries';
import { emptyPlaceFormValues, PlaceForm } from '~/features/places/place-form';
import { useCreatePlace } from '~/features/places/queries';

export const Route = createFileRoute('/places/new')({
  // The location options.
  loader: async ({ context }) => {
    await context.queryClient.query(locationQueries.list());
  },
  component: NewPlacePage,
});

function NewPlacePage() {
  const { data: locations } = useSuspenseQuery(locationQueries.list());
  const create = useCreatePlace();
  const navigate = useNavigate();
  const { t } = useTranslation();
  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <PageHeading title={t('places.new')} />
      <Card>
        <CardContent>
          <PlaceForm
            defaultValues={emptyPlaceFormValues}
            locations={locations}
            submitLabel={t('common.create')}
            onSubmit={async (values) => {
              const created = await create.mutateAsync(values); // throws ApiError -> shown by the form
              await navigate({
                to: '/places/$placeId',
                params: { placeId: created.id },
              });
            }}
          />
        </CardContent>
      </Card>
    </section>
  );
}
