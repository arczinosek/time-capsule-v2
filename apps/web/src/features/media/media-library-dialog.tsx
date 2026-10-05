import { useQuery } from '@tanstack/react-query';
import type { MediaResponse, MediaTarget } from '@time-capsule/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IconPhoto } from '~/components/icons/action-icons';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog';
import { toMediaErrorMessage } from './error-message';
import { MediaError } from './media-error';
import { mediaQueries, useUpdateOwnerMedia } from './queries';

/**
 * "Choose from the library": every ready photo the owner doesn't show yet. Picking one links
 * it (PUT the owner's ids plus that one) and closes the dialog. The library loads only while
 * the dialog is open.
 */
export function MediaLibraryDialog({
  target,
  media,
  disabled,
}: {
  target: MediaTarget;
  /** The owner's photos: hidden from the list, and the ids the PUT keeps. */
  media: MediaResponse[];
  /** No free slot, or uploads in progress. */
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();
  const library = useQuery({ ...mediaQueries.library(), enabled: open });
  const link = useUpdateOwnerMedia(target);
  const mediaIds = media.map((item) => item.id);
  const available = (library.data ?? []).filter(
    (item) => !mediaIds.includes(item.id),
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (link.isPending) return; // no closing mid-request
        setOpen(next);
        link.reset();
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline" disabled={disabled}>
          <IconPhoto />
          {t('media.library')}
        </Button>
      </DialogTrigger>
      {/* No built-in close button: its sr-only text is English. Cancel closes it. */}
      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-lg"
      >
        <DialogHeader>
          <DialogTitle>{t('media.libraryTitle')}</DialogTitle>
          <DialogDescription>{t('media.libraryDescription')}</DialogDescription>
        </DialogHeader>
        {library.isPending ? (
          <p role="status" className="text-muted-foreground">
            {t('common.loading')}
          </p>
        ) : library.error ? (
          <MediaError error={toMediaErrorMessage(library.error)} />
        ) : available.length === 0 ? (
          <p className="text-muted-foreground">{t('media.libraryEmpty')}</p>
        ) : (
          <ul className="grid grid-cols-3 gap-2">
            {available.map((item, position) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="block w-full rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring disabled:opacity-50"
                  aria-label={t('media.libraryPick', { index: position + 1 })}
                  disabled={link.isPending}
                  onClick={() =>
                    link.mutate(
                      {
                        mediaIds: [...mediaIds, item.id],
                        baseMediaIds: mediaIds,
                      },
                      { onSuccess: () => setOpen(false) },
                    )
                  }
                >
                  {/* Decorative: the button carries the name. */}
                  <img
                    src={item.url}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="aspect-square w-full rounded-md bg-muted object-cover"
                  />
                </button>
              </li>
            ))}
          </ul>
        )}
        {link.error && <MediaError error={toMediaErrorMessage(link.error)} />}
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={link.isPending}>
              {t('common.cancel')}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
