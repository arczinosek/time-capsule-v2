import { BadRequestException } from '@nestjs/common';
import { validationErrorBodySchema } from '@time-capsule/shared';
import { z } from 'zod';
import { ZodValidationPipe } from './zod-validation.pipe.js';

describe('ZodValidationPipe', () => {
  const pipe = new ZodValidationPipe(
    z.object({
      name: z.string().trim(),
      title: z.string().min(1, 'validation.title.required').optional(),
    }),
  );

  function bodyOf(value: unknown): unknown {
    try {
      pipe.transform(value);
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      return (error as BadRequestException).getResponse();
    }
    throw new Error('expected the pipe to throw');
  }

  it('returns the parsed value', () => {
    expect(pipe.transform({ name: ' Ada ', extra: true })).toEqual({
      name: 'Ada',
    });
  });

  it('throws BadRequestException with the shared validation error body', () => {
    const body = bodyOf({ name: 42 });

    expect(validationErrorBodySchema.safeParse(body).success).toBe(true);
    expect(body).toMatchObject({ message: 'validation.failed' });
  });

  it('reports an issue without its own message as the validation.invalid key', () => {
    const expectedFieldErrors = { name: ['validation.invalid'] };

    expect(bodyOf({ name: 42 })).toMatchObject({
      errors: { formErrors: [], fieldErrors: expectedFieldErrors },
    });
  });

  it("keeps the schema's own key", () => {
    const expectedFieldErrors = { title: ['validation.title.required'] };

    expect(bodyOf({ name: 'Ada', title: '' })).toMatchObject({
      errors: { fieldErrors: expectedFieldErrors },
    });
  });
});
