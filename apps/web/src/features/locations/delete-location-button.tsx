import type { LocationResponse } from '@time-capsule/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '~/components/ui/alert-dialog';
import { Button } from '~/components/ui/button';
import { useTranslateMessage } from '~/i18n';
import { toErrorMessage } from '~/lib/api-client';
import { useDeleteLocation } from './queries';

export function DeleteLocationButton({ location }: { location: LocationResponse }) {
  const [open, setOpen] = useState(false);
  const remove = useDeleteLocation();
  const { t } = useTranslation();
  const translate = useTranslateMessage();

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (remove.isPending) return; // no closing (Esc, Cancel) mid-delete
        setOpen(next);
        remove.reset(); // drop a previous error
      }}
    >
      <AlertDialogTrigger asChild>
        <Button
          variant="destructive"
          size="sm"
          aria-label={t('locations.deleteLabel', { name: location.name })}
        >
          {t('common.delete')}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t('locations.deleteTitle', { name: location.name })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('locations.deleteDescription')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {remove.error && (
          <p role="alert" className="text-sm text-destructive">
            {translate(toErrorMessage(remove.error))}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={remove.isPending}>
            {t('common.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={remove.isPending}
            onClick={(event) => {
              // Radix closes on click; keep the dialog open until the delete has finished.
              event.preventDefault();
              remove.mutate(location.id, { onSuccess: () => setOpen(false) });
            }}
          >
            {t('common.delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
