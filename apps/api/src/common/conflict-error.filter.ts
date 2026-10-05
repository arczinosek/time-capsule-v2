import {
  Catch,
  ConflictException,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { ConflictError } from './conflict.error.js';

// Answers ConflictError with the same 409 body as Nest's ConflictException
// ({ statusCode, message, error }); `message` is an i18n key.
@Catch(ConflictError)
export class ConflictErrorFilter implements ExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(error: ConflictError, host: ArgumentsHost): void {
    const exception = new ConflictException(error.key);
    this.httpAdapterHost.httpAdapter.reply(
      host.switchToHttp().getResponse(),
      exception.getResponse(),
      exception.getStatus(),
    );
  }
}
