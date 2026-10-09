import { createMock } from '@golevelup/ts-vitest';
import type { ArgumentsHost } from '@nestjs/common';
import type { HttpAdapterHost } from '@nestjs/core';
import { messages } from '@time-capsule/shared';
import { ConflictErrorFilter } from './conflict-error.filter.js';
import { ConflictError } from './conflict.error.js';

describe('ConflictErrorFilter', () => {
  it('replies 409 with the ConflictException body and the key as its message', () => {
    const response = {};
    const adapterHostMock = createMock<HttpAdapterHost>();
    const hostMock = createMock<ArgumentsHost>({
      switchToHttp: () => ({ getResponse: () => response }),
    });
    const filter = new ConflictErrorFilter(adapterHostMock);

    const expectedBody = {
      statusCode: 409,
      message: 'validation.media.capMilestone',
      error: 'Conflict',
    };

    filter.catch(new ConflictError(messages.mediaCapMilestone), hostMock);

    expect(adapterHostMock.httpAdapter.reply).toHaveBeenCalledWith(
      response,
      expectedBody,
      409,
    );
  });
});
