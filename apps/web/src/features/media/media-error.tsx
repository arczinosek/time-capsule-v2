import { useTranslation } from 'react-i18next';
import { useTranslateMessage } from '~/i18n';
import type { MediaErrorMessage } from './error-message';

/** A failed photo request or a refused file, translated at render. */
export function MediaError({ error }: { error: MediaErrorMessage }) {
  const { t } = useTranslation();
  const translate = useTranslateMessage();
  return (
    <p role="alert" className="text-sm text-destructive">
      {error.message === 'media.upload.failed'
        ? t('media.upload.failed', { code: error.code ?? '' })
        : translate(error.message)}
    </p>
  );
}
