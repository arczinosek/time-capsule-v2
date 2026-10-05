import { MEDIA_CONTENT_TYPES } from '@time-capsule/shared';
import { X } from 'lucide-react';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '~/components/ui/button';
import { Field, FieldDescription, FieldLabel } from '~/components/ui/field';
import { Input } from '~/components/ui/input';
import { MediaError } from './media-error';
import type { UploadItem } from './use-media-uploader';

// This exact list (no wildcards) also makes iOS convert HEIC photos to JPEG.
const ACCEPT = MEDIA_CONTENT_TYPES.join(',');

/** The file input and the files on their way, each with progress or its error. */
export function MediaUploader({
  items,
  full,
  onFiles,
  onDismiss,
}: {
  items: UploadItem[];
  /** No free slot: the input is disabled. */
  full: boolean;
  onFiles: (files: File[]) => void;
  onDismiss: (id: number) => void;
}) {
  const { t } = useTranslation();
  const inputId = useId();
  return (
    <div className="space-y-3">
      <Field>
        <FieldLabel htmlFor={inputId}>{t('media.add')}</FieldLabel>
        <Input
          id={inputId}
          type="file"
          multiple
          accept={ACCEPT}
          disabled={full}
          onChange={(event) => {
            onFiles([...(event.target.files ?? [])]);
            // Lets the same file be picked again after an error.
            event.target.value = '';
          }}
        />
        <FieldDescription>
          {full ? t('media.full') : t('media.hint')}
        </FieldDescription>
      </Field>
      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className="space-y-1 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate">{item.name}</span>
                {item.error && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t('media.dismissLabel', { name: item.name })}
                    onClick={() => onDismiss(item.id)}
                  >
                    <X aria-hidden="true" />
                  </Button>
                )}
              </div>
              {item.error ? (
                <MediaError error={item.error} />
              ) : (
                <progress
                  className="w-full"
                  value={item.progress}
                  max={1}
                  aria-label={t('media.uploading', { name: item.name })}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
