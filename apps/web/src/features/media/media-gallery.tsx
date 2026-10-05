import type { MediaResponse, MediaTarget } from '@time-capsule/shared';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IconNext, IconPhoto, IconPrev } from '~/components/icons/action-icons';
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
import { MediaLightbox } from './media-lightbox';
import { useUpdateOwnerMedia } from './queries';

/** The photo, or a placeholder (with the same name) when its URL doesn't load. */
function MediaImage({ url, alt }: { url: string; alt: string }) {
  const { t } = useTranslation();
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className="flex size-full flex-col items-center justify-center gap-2 bg-muted p-2 text-center text-xs text-muted-foreground">
        <IconPhoto className="size-6" />
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
      className="size-full bg-muted object-cover"
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
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  // The thumbnail that opened the lightbox, and its position as a fallback when that element
  // is gone by the time it closes (the set changed meanwhile).
  const openerRef = useRef<{ element: HTMLElement; position: number } | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
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
      <ul ref={listRef} className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {media.map((item, position) => {
          const index = position + 1;
          return (
            <li key={item.id} className="space-y-2">
              {/* Opens the lightbox; the photo keeps its alt text inside. */}
              <button
                type="button"
                className="chronicle-frame block aspect-square w-full cursor-zoom-in"
                data-thumbnail=""
                aria-label={t('lightbox.open', { index, label })}
                onClick={(event) => {
                  openerRef.current = { element: event.currentTarget, position };
                  setOpenIndex(position);
                }}
              >
                <MediaImage url={item.url} alt={t('media.alt', { index, label })} />
              </button>
              <div className="flex flex-wrap items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t('media.moveEarlier', { index })}
                  disabled={position === 0 || move.isPending || disabled}
                  onClick={() => moveBy(position, -1)}
                >
                  <IconPrev />
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
                  <IconNext />
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
      <MediaLightbox
        media={media}
        label={label}
        index={openIndex}
        onIndexChange={setOpenIndex}
        onClose={() => setOpenIndex(null)}
        returnFocusTo={() => {
          const opener = openerRef.current;
          if (!opener) return null;
          if (opener.element.isConnected) return opener.element;
          const thumbnails =
            listRef.current?.querySelectorAll<HTMLElement>('[data-thumbnail]') ?? [];
          return thumbnails[Math.min(opener.position, thumbnails.length - 1)];
        }}
      />
    </div>
  );
}
