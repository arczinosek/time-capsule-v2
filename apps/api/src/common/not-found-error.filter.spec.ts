import { createMock } from '@golevelup/ts-vitest';
import type { ArgumentsHost } from '@nestjs/common';
import type { HttpAdapterHost } from '@nestjs/core';
import { NotFoundErrorFilter } from './not-found-error.filter.js';
import { NotFoundError } from './not-found.error.js';

describe('NotFoundErrorFilter', () => {
  it('replies 404 with the NotFoundException body', () => {
    const adapterHost = createMock<HttpAdapterHost>();
    const response = {};
    const host = createMock<ArgumentsHost>({
      switchToHttp: () => ({ getResponse: () => response }),
    });
    const filter = new NotFoundErrorFilter(adapterHost);

    filter.catch(new NotFoundError('Milestone 1 not found'), host);

    expect(adapterHost.httpAdapter.reply).toHaveBeenCalledWith(
      response,
      { statusCode: 404, message: 'Milestone 1 not found', error: 'Not Found' },
      404,
    );
  });
});
