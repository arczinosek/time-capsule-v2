import { BadRequestException, PipeTransform } from '@nestjs/common';
import {
  fallbackErrorMap,
  messages,
  type ValidationErrorBody,
} from '@time-capsule/shared';
import { z } from 'zod';

export class ZodValidationPipe<T extends z.ZodType> implements PipeTransform {
  constructor(private readonly schema: T) {}

  transform(value: unknown): z.output<T> {
    // A check's own key wins; anything the schema doesn't name gets 'validation.invalid',
    // so every message in the body is an i18n key the web can translate.
    const result = this.schema.safeParse(value, { error: fallbackErrorMap });

    if (!result.success) {
      const body: ValidationErrorBody = {
        message: messages.failed,
        errors: z.flattenError(result.error),
      };

      throw new BadRequestException(body);
    }

    return result.data;
  }
}
