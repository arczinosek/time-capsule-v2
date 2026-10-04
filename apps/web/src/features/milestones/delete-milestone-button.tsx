import type { MilestoneResponse } from '@time-capsule/shared';
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
import { useDeleteMilestone } from './queries';

export function DeleteMilestoneButton({
  milestone,
  onDeleted,
}: {
  milestone: MilestoneResponse;
  /** Called after a successful delete, e.g. to leave a page that shows this milestone. */
  onDeleted?: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const remove = useDeleteMilestone();
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
          aria-label={t('milestones.deleteLabel', { title: milestone.title })}
        >
          {t('common.delete')}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t('milestones.deleteTitle', { title: milestone.title })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('milestones.deleteDescription')}
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
              // Radix closes on click; keep the dialog open until the delete has finished,
              // so the pending state and any error are visible.
              event.preventDefault();
              remove.mutate(milestone.id, {
                onSuccess: async () => {
                  setOpen(false);
                  await onDeleted?.();
                },
              });
            }}
          >
            {t('common.delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
