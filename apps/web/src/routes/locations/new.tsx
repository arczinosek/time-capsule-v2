import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import {
  emptyLocationFormValues,
  LocationForm,
} from '~/features/locations/location-form';
import { useCreateLocation } from '~/features/locations/queries';

export const Route = createFileRoute('/locations/new')({
  component: NewLocationPage,
});

function NewLocationPage() {
  const create = useCreateLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  return (
    <section className="space-y-6">
      <h1 className="text-xl font-semibold">{t('locations.new')}</h1>
      <Card>
        <CardContent>
          <LocationForm
            defaultValues={emptyLocationFormValues}
            submitLabel={t('common.create')}
            cancel={
              <Button variant="outline" asChild>
                <Link to="/locations">{t('common.cancel')}</Link>
              </Button>
            }
            onSubmit={async (values) => {
              await create.mutateAsync(values); // throws ApiError -> shown by the form
              await navigate({ to: '/locations' });
            }}
          />
        </CardContent>
      </Card>
    </section>
  );
}
