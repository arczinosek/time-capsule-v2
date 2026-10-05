import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { PageHeading } from '~/components/page-heading';
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
    <section className="mx-auto max-w-2xl space-y-6">
      <PageHeading title={t('locations.new')} />
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
