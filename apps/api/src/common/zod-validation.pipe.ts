import { BadRequestException, PipeTransform } from '@nestjs/common';
import type { ValidationErrorBody } from '@time-capsule/shared';
import { z } from 'zod';

export class ZodValidationPipe<T extends z.ZodType> implements PipeTransform {
  constructor(private readonly schema: T) {}

  transform(value: unknown): z.output<T> {
    const result = this.schema.safeParse(value);

    if (!result.success) {
      const body: ValidationErrorBody = {
        message: 'Validation failed',
        errors: z.flattenError(result.error),
      };

      throw new BadRequestException(body);
    }

    return result.data;
  }
}
