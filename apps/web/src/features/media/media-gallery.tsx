import type { MediaResponse, MediaTarget } from '@time-capsule/shared';
import { ChevronLeft, ChevronRight, ImageOff } from 'lucide-react';
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
import { toMediaErrorMessage } from './error-message';
import { MediaError } from './media-error';
import { useUpdateOwnerMedia } from './queries';

/** The photo, or a placeholder (with the same name) when its URL doesn't load. */
function MediaImage({ url, alt }: { url: string; alt: string }) {
  const { t } = useTranslation();
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className="flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-md bg-muted p-2 text-center text-xs text-muted-foreground">
        <ImageOff aria-hidden="true" className="size-6" />
        <span className="sr-only">{alt}</span>
        <span>{t('media.loadFailed')}</span>
      </div>
    );
  }
  return (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      decoding="async"
      className="aspect-square w-full rounded-md bg-muted object-cover"
      onError={() => setFailed(true)}
    />
  );
}

/** Unlinks one photo after confirming: PUT the owner's ids without it. */
function RemoveMediaButton({
  target,
  mediaIds,
  mediaId,
  index,
  disabled,
}: {
  target: MediaTarget;
  mediaIds: number[];
  mediaId: number;
  /** 1-based position, for the accessible name. */
  index: number;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const update = useUpdateOwnerMedia(target);
  const { t } = useTranslation();

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (update.isPending) return; // no closing (Esc, Cancel) mid-request
        setOpen(next);
        update.reset(); // drop a previous error
      }}
    >
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label={t('media.removeLabel', { index })}
          disabled={disabled}
        >
          {t('media.remove')}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('media.removeTitle')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('media.removeDescription')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {update.error && (
          <MediaError error={toMediaErrorMessage(update.error)} />
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={update.isPending}>
            {t('common.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={update.isPending}
            onClick={(event) => {
              // Keep the dialog open until the PUT has finished, so the pending state and any
              // error are visible.
              event.preventDefault();
              update.mutate(
                {
                  mediaIds: mediaIds.filter((id) => id !== mediaId),
                  baseMediaIds: mediaIds,
                },
                { onSuccess: () => setOpen(false) },
              );
            }}
          >
            {t('media.remove')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * The owner's ready photos in gallery order. Each can move one place (PUT with the reordered
 * ids) or be removed (PUT without it). `label` names the owner in each photo's alt text.
 */
export function MediaGallery({
  target,
  media,
  label,
  disabled,
}: {
  target: MediaTarget;
  media: MediaResponse[];
  label: string;
  /** Uploads in progress: the set on screen is about to change, so no PUT from it. */
  disabled: boolean;
}) {
  const { t } = useTranslation();
  const move = useUpdateOwnerMedia(target);
  const mediaIds = media.map((item) => item.id);

  function moveBy(from: number, offset: -1 | 1) {
    const ids = [...mediaIds];
    const [id] = ids.splice(from, 1);
    ids.splice(from + offset, 0, id);
    move.mutate({ mediaIds: ids, baseMediaIds: mediaIds });
  }

  if (media.length === 0) {
    return <p className="text-muted-foreground">{t('media.empty')}</p>;
  }

  return (
    <div className="space-y-2">
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {media.map((item, position) => {
          const index = position + 1;
          return (
            <li key={item.id} className="space-y-2">
              <MediaImage url={item.url} alt={t('media.alt', { index, label })} />
              <div className="flex flex-wrap items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t('media.moveEarlier', { index })}
                  disabled={position === 0 || move.isPending || disabled}
                  onClick={() => moveBy(position, -1)}
                >
                  <ChevronLeft aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t('media.moveLater', { index })}
                  disabled={
                    position === media.length - 1 || move.isPending || disabled
                  }
                  onClick={() => moveBy(position, 1)}
                >
                  <ChevronRight aria-hidden="true" />
                </Button>
                <RemoveMediaButton
                  target={target}
                  mediaIds={mediaIds}
                  mediaId={item.id}
                  index={index}
                  disabled={disabled}
                />
              </div>
            </li>
          );
        })}
      </ul>
      {move.error && <MediaError error={toMediaErrorMessage(move.error)} />}
    </div>
  );
}
