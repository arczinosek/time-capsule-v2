import type { MediaResponse } from '@time-capsule/shared';
import { useRef, type KeyboardEvent, type TouchEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { IconClose, IconNext, IconPrev } from '~/components/icons/action-icons';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from '~/components/ui/dialog';

/** A horizontal swipe longer than this (px) turns the page. */
const SWIPE_MIN_PX = 50;

/**
 * One photo enlarged, over the page. Controlled: `index` is the photo shown (null = closed).
 * Previous/next (buttons, ArrowLeft/ArrowRight, a swipe) stop at the ends; Escape or Close
 * closes it, and focus goes to `returnFocusTo()` (the thumbnail that opened it).
 */
export function MediaLightbox({
  media,
  label,
  index,
  onIndexChange,
  onClose,
  returnFocusTo,
}: {
  media: MediaResponse[];
  /** The owner's title or name, for the alt text and the dialog title. */
  label: string;
  index: number | null;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  /**
   * Where focus goes on close. Radix returns focus only to a DialogTrigger, and a gallery has
   * many thumbnails; the caller remembers the one clicked (`event.currentTarget`: Safari doesn't
   * focus a button on click, so document.activeElement would be <body>).
   */
  returnFocusTo: () => HTMLElement | null | undefined;
}) {
  const open = index !== null && index >= 0 && index < media.length;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      {open && (
        <LightboxContent
          media={media}
          label={label}
          index={index}
          onIndexChange={onIndexChange}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            returnFocusTo()?.focus();
          }}
        />
      )}
    </Dialog>
  );
}

function LightboxContent({
  media,
  label,
  index,
  onIndexChange,
  onCloseAutoFocus,
}: {
  media: MediaResponse[];
  label: string;
  index: number;
  onIndexChange: (index: number) => void;
  onCloseAutoFocus: (event: Event) => void;
}) {
  const { t } = useTranslation();
  const previousRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const touchStartX = useRef<number | null>(null);
  const total = media.length;
  const current = index + 1;
  const item = media[index]!;

  function go(offset: -1 | 1) {
    const target = index + offset;
    if (target < 0 || target >= total) return;
    onIndexChange(target);
    // A focused button that gets disabled at an end drops focus: move it to the other one.
    const focused = document.activeElement;
    if (target === 0 && focused === previousRef.current) nextRef.current?.focus();
    if (target === total - 1 && focused === nextRef.current) {
      previousRef.current?.focus();
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      go(-1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      go(1);
    }
  }

  function handleTouchEnd(event: TouchEvent) {
    const start = touchStartX.current;
    touchStartX.current = null;
    const end = event.changedTouches[0]?.clientX;
    if (start === null || end === undefined) return;
    const distance = end - start;
    if (distance <= -SWIPE_MIN_PX) go(1);
    else if (distance >= SWIPE_MIN_PX) go(-1);
  }

  return (
    // No built-in close button: its sr-only text is English. Close is ours.
    <DialogContent
      showCloseButton={false}
      aria-describedby={undefined}
      className="max-w-[calc(100%-1rem)] gap-3 bg-card p-3 sm:max-w-3xl"
      onKeyDown={handleKeyDown}
      onTouchStart={(event) => {
        touchStartX.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={handleTouchEnd}
      onCloseAutoFocus={onCloseAutoFocus}
    >
      <DialogTitle className="sr-only">
        {t('lightbox.title', { current, total, label })}
      </DialogTitle>
      <figure className="chronicle-frame">
        <img
          key={item.id}
          src={item.url}
          alt={t('media.alt', { index: current, label })}
          decoding="async"
          className="mx-auto max-h-[75svh] w-full object-contain"
        />
      </figure>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          ref={previousRef}
          type="button"
          variant="outline"
          size="icon-lg"
          aria-label={t('lightbox.previous')}
          disabled={index === 0}
          onClick={() => go(-1)}
        >
          <IconPrev />
        </Button>
        <p aria-live="polite" className="font-heading tabular text-muted-foreground">
          {t('lightbox.counter', { current, total })}
        </p>
        <div className="flex items-center gap-2">
          <Button
            ref={nextRef}
            type="button"
            variant="outline"
            size="icon-lg"
            aria-label={t('lightbox.next')}
            disabled={index === total - 1}
            onClick={() => go(1)}
          >
            <IconNext />
          </Button>
          <DialogClose asChild>
            <Button type="button" variant="outline" size="lg">
              <IconClose />
              {t('lightbox.close')}
            </Button>
          </DialogClose>
        </div>
      </div>
    </DialogContent>
  );
}
