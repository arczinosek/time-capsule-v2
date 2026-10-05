import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { PageHeading } from '~/components/page-heading';
import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import {
  LocationForm,
  toLocationFormValues,
} from '~/features/locations/location-form';
import {
  locationQueries,
  useUpdateLocation,
} from '~/features/locations/queries';

// The detail loader, params and not-found page live in ./route.tsx.
export const Route = createFileRoute('/locations/$locationId/edit')({
  component: EditLocationPage,
});

function EditLocationPage() {
  const { locationId } = Route.useParams();
  const { data: location } = useSuspenseQuery(locationQueries.detail(locationId));
  const update = useUpdateLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <PageHeading title={t('locations.edit')} />
      <Card>
        <CardContent>
          <LocationForm
            // The router reuses this component across ids and RHF reads defaultValues once.
            key={location.id}
            defaultValues={toLocationFormValues(location)}
            submitLabel={t('common.save')}
            cancel={
              <Button variant="outline" asChild>
                <Link to="/locations">{t('common.cancel')}</Link>
              </Button>
            }
            onSubmit={async (values) => {
              await update.mutateAsync({ id: location.id, request: values });
              await navigate({ to: '/locations' });
            }}
          />
        </CardContent>
      </Card>
    </section>
  );
}
