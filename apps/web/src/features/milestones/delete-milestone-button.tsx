import type { MilestoneResponse } from '@time-capsule/shared';
import { useState } from 'react';
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
import { useDeleteMilestone } from './queries';

export function DeleteMilestoneButton({
  milestone,
}: {
  milestone: MilestoneResponse;
}) {
  const [open, setOpen] = useState(false);
  const remove = useDeleteMilestone();

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
          aria-label={`Delete ${milestone.title}`}
        >
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {milestone.title}?</AlertDialogTitle>
          <AlertDialogDescription>This can't be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        {remove.error && (
          <p role="alert" className="text-sm text-destructive">
            {remove.error.message}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={remove.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={remove.isPending}
            onClick={(event) => {
              // Radix closes on click; keep the dialog open until the delete has finished,
              // so the pending state and any error are visible.
              event.preventDefault();
              remove.mutate(milestone.id, { onSuccess: () => setOpen(false) });
            }}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
