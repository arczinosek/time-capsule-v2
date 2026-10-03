import { validationErrorBodySchema } from '@time-capsule/shared';
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { ApiError } from './api-client';

/**
 * Shows a failed submit in a React Hook Form form. The api's 400 validation body (see
 * ZodValidationPipe) goes onto the matching fields; anything else (other statuses, network
 * and CORS failures, a malformed body) goes into errors.root.server. Field names match because
 * the form and the api validate with the same shared schema.
 */
export function applyApiErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
): void {
  if (error instanceof ApiError && error.status === 400) {
    const parsed = validationErrorBodySchema.safeParse(error.body);

    if (parsed.success) {
      const { fieldErrors, formErrors } = parsed.data.errors;
      let fieldCount = 0;

      for (const [name, messages] of Object.entries(fieldErrors)) {
        const message = messages?.[0];

        if (!message) continue;

        setError(name as Path<T>, { type: 'server', message });
        fieldCount++;
      }

      if (formErrors.length > 0 || fieldCount === 0) {
        setError('root.server', {
          type: 'server',
          message: formErrors[0] ?? parsed.data.message,
        });
      }

      return;
    }
  }

  setError('root.server', {
    type: 'server',
    message: error instanceof Error ? error.message : String(error),
  });
}
