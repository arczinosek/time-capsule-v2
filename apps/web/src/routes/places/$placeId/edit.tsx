import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { PageHeading } from '~/components/page-heading';
import { Card, CardContent } from '~/components/ui/card';
import { locationQueries } from '~/features/locations/queries';
import { PlaceForm, toPlaceFormValues } from '~/features/places/place-form';
import { placeQueries, useUpdatePlace } from '~/features/places/queries';

// The detail loader, params and not-found page live in ./route.tsx.
export const Route = createFileRoute('/places/$placeId/edit')({
  // The location options.
  loader: async ({ context }) => {
    await context.queryClient.query(locationQueries.list());
  },
  component: EditPlacePage,
});

function EditPlacePage() {
  const { placeId } = Route.useParams();
  const { data: place } = useSuspenseQuery(placeQueries.detail(placeId));
  const { data: locations } = useSuspenseQuery(locationQueries.list());
  const update = useUpdatePlace();
  const navigate = useNavigate();
  const { t } = useTranslation();
  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <PageHeading title={t('places.edit')} />
      <Card>
        <CardContent>
          <PlaceForm
            // The router reuses this component across ids and RHF reads defaultValues once.
            key={place.id}
            defaultValues={toPlaceFormValues(place)}
            locations={locations}
            submitLabel={t('common.save')}
            placeId={place.id}
            onSubmit={async (values) => {
              await update.mutateAsync({ id: place.id, request: values });
              await navigate({
                to: '/places/$placeId',
                params: { placeId: place.id },
              });
            }}
          />
        </CardContent>
      </Card>
    </section>
  );
}
