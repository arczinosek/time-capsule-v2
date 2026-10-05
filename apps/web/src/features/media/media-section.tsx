import { messages, type MediaResponse, type MediaTarget } from '@time-capsule/shared';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { MediaGallery } from './media-gallery';
import { MediaLibraryDialog } from './media-library-dialog';
import { MediaUploader } from './media-uploader';
import { useMediaUploader } from './use-media-uploader';

/**
 * An owner's photos on its page: a counter against the cap, the gallery, uploads and the
 * library. `media` comes from the owner's detail response; `label` (its title or name) goes
 * into each photo's alt text.
 */
export function MediaSection({
  target,
  media,
  max,
  label,
}: {
  target: MediaTarget;
  media: MediaResponse[];
  /** MAX_MILESTONE_MEDIA or MAX_FAMILY_MEMBER_MEDIA. */
  max: number;
  label: string;
}) {
  const { t } = useTranslation();
  const headingId = useId();
  const uploader = useMediaUploader({
    target,
    count: media.length,
    max,
    capMessage:
      target.type === 'milestone'
        ? messages.mediaCapMilestone
        : messages.mediaCapFamilyMember,
  });
  // Uploads in flight hold a slot too (the api counts them).
  const full = media.length + uploader.active >= max;
  // Each finished upload changes the set on screen: no PUT (built from it) until they're done.
  const uploading = uploader.active > 0;

  return (
    <section aria-labelledby={headingId} className="space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id={headingId} className="text-lg font-semibold">
          {t('media.title')}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t('media.count', { count: media.length, max })}
        </p>
      </div>
      <MediaGallery
        target={target}
        media={media}
        label={label}
        disabled={uploading}
      />
      <MediaUploader
        items={uploader.items}
        full={full}
        onFiles={uploader.addFiles}
        onDismiss={uploader.dismiss}
      />
      <MediaLibraryDialog
        target={target}
        media={media}
        disabled={full || uploading}
      />
    </section>
  );
}
