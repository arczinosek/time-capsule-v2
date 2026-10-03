import { BadRequestException } from '@nestjs/common';
import { validationErrorBodySchema } from '@time-capsule/shared';
import { z } from 'zod';
import { ZodValidationPipe } from './zod-validation.pipe.js';

describe('ZodValidationPipe', () => {
  const pipe = new ZodValidationPipe(z.object({ name: z.string().trim() }));

  it('returns the parsed value', () => {
    expect(pipe.transform({ name: ' Ada ', extra: true })).toEqual({
      name: 'Ada',
    });
  });

  it('throws BadRequestException with the shared validation error body', () => {
    expect.assertions(3);

    try {
      pipe.transform({ name: 42 });
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);

      const body = (error as BadRequestException).getResponse();
      expect(validationErrorBodySchema.safeParse(body).success).toBe(true);
      expect(body).toMatchObject({
        errors: { fieldErrors: { name: expect.any(Array) } },
      });
    }
  });
});
