import { createMock } from '@golevelup/ts-vitest';
import type { ArgumentsHost } from '@nestjs/common';
import type { HttpAdapterHost } from '@nestjs/core';
import { messages, validationErrorBodySchema } from '@time-capsule/shared';
import { FieldValidationErrorFilter } from './field-validation-error.filter.js';
import { FieldValidationError } from './field-validation.error.js';

describe('FieldValidationErrorFilter', () => {
  it('replies 400 with the shared validation error body, one key per field', () => {
    const response = {};
    const adapterHostMock = createMock<HttpAdapterHost>();
    const hostMock = createMock<ArgumentsHost>({
      switchToHttp: () => ({ getResponse: () => response }),
    });

    const expectedBody = {
      message: 'validation.failed',
      errors: {
        formErrors: [],
        fieldErrors: {
          motherId: ['validation.familyMember.notFound'],
          fatherId: ['validation.parent.self'],
        },
      },
    };

    const filter = new FieldValidationErrorFilter(adapterHostMock);

    filter.catch(
      new FieldValidationError({
        motherId: messages.familyMemberNotFound,
        fatherId: messages.ownParent,
      }),
      hostMock,
    );

    expect(adapterHostMock.httpAdapter.reply).toHaveBeenCalledWith(
      response,
      expectedBody,
      400,
    );
    expect(validationErrorBodySchema.parse(expectedBody)).toEqual(expectedBody);
  });
});
