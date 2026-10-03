import { z } from 'zod';

// Body of the api's 400 answer when a request body fails its shared schema
// (apps/api/src/common/zod-validation.pipe.ts): z.flattenError() under `errors`.
// Other 400s, e.g. a non-numeric :id, keep Nest's default { message, error, statusCode } shape.
export const validationErrorBodySchema = z.object({
  message: z.string(),
  errors: z.object({
    formErrors: z.array(z.string()),
    fieldErrors: z.record(z.string(), z.array(z.string()).optional()),
  }),
});

export type ValidationErrorBody = z.infer<typeof validationErrorBodySchema>;
