import type { LocationResponse } from '@time-capsule/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IconAdd } from '~/components/icons/action-icons';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog';
import { emptyLocationFormValues, LocationForm } from './location-form';
import { useCreateLocation } from './queries';

/**
 * "New location" next to a location select, inside another form. `onCreated` runs once the
 * location lists are fresh, so the new option already exists when the caller selects it.
 */
export function CreateLocationDialog({
  onCreated,
}: {
  onCreated: (location: LocationResponse) => void;
}) {
  const [open, setOpen] = useState(false);
  const create = useCreateLocation();
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          <IconAdd />
          {t('locations.new')}
        </Button>
      </DialogTrigger>
      {/* No built-in close button: its sr-only text is English. Cancel closes it. */}
      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-lg"
      >
        <DialogHeader>
          <DialogTitle>{t('locations.new')}</DialogTitle>
          <DialogDescription>{t('locations.newDescription')}</DialogDescription>
        </DialogHeader>
        <LocationForm
          defaultValues={emptyLocationFormValues}
          submitLabel={t('common.create')}
          cancel={
            <DialogClose asChild>
              <Button type="button" variant="outline">
                {t('common.cancel')}
              </Button>
            </DialogClose>
          }
          onSubmit={async (values) => {
            const location = await create.mutateAsync(values); // throws ApiError -> shown by the form
            setOpen(false);
            onCreated(location);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
