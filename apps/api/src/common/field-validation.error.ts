import type { MessageKey } from '@time-capsule/shared';

// Application-layer error for a request that passed its schema but fails a check that needs
// the database (e.g. a parent id that doesn't exist). Services throw it with an i18n key per
// field; FieldValidationErrorFilter answers it with the same 400 body as ZodValidationPipe, so
// the web puts each key on its form field.
export class FieldValidationError extends Error {
  override name = 'FieldValidationError';

  constructor(readonly fieldErrors: Partial<Record<string, MessageKey>>) {
    super(`Invalid fields: ${Object.keys(fieldErrors).join(', ')}`);
  }
}
