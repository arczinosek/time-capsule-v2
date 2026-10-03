import {
  Catch,
  NotFoundException,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { NotFoundError } from './not-found.error.js';

// Answers NotFoundError with the same 404 body as Nest's NotFoundException
// ({ statusCode, message, error }), whose `message` the web displays.
@Catch(NotFoundError)
export class NotFoundErrorFilter implements ExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(error: NotFoundError, host: ArgumentsHost): void {
    const exception = new NotFoundException(error.message);
    this.httpAdapterHost.httpAdapter.reply(
      host.switchToHttp().getResponse(),
      exception.getResponse(),
      exception.getStatus(),
    );
  }
}
