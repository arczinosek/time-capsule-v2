import { validationErrorBodySchema } from '@time-capsule/shared';
import { ApiError, toErrorMessage } from '~/lib/api-client';
import { StorageUploadError } from '~/lib/upload';

/** A failed photo request, ready for the UI: an i18n key (or raw api text), plus a code. */
export type MediaErrorMessage = { message: string; code?: string };

/**
 * There is no form field to put a 400 on: show its first field or form error (an i18n key,
 * e.g. `validation.media.notReady`) instead of the generic "check the highlighted fields".
 */
export function toMediaErrorMessage(error: unknown): MediaErrorMessage {
  if (error instanceof StorageUploadError) {
    return { message: error.key, code: error.code ?? String(error.status) };
  }
  if (error instanceof ApiError && error.status === 400) {
    const parsed = validationErrorBodySchema.safeParse(error.body);
    if (parsed.success) {
      const { fieldErrors, formErrors } = parsed.data.errors;
      const first =
        Object.values(fieldErrors).find((messages) => messages?.length)?.[0] ??
        formErrors[0];
      if (first) return { message: first };
    }
  }
  return { message: toErrorMessage(error) };
}
