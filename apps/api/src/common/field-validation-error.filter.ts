import {
  BadRequestException,
  Catch,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { messages, type ValidationErrorBody } from '@time-capsule/shared';
import { FieldValidationError } from './field-validation.error.js';

// Answers FieldValidationError with the 400 ValidationErrorBody of ZodValidationPipe.
@Catch(FieldValidationError)
export class FieldValidationErrorFilter implements ExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(error: FieldValidationError, host: ArgumentsHost): void {
    const fieldErrors: Record<string, string[]> = {};
    for (const [field, message] of Object.entries(error.fieldErrors)) {
      if (message) fieldErrors[field] = [message];
    }
    const body: ValidationErrorBody = {
      message: messages.failed,
      errors: { formErrors: [], fieldErrors },
    };
    const exception = new BadRequestException(body);

    this.httpAdapterHost.httpAdapter.reply(
      host.switchToHttp().getResponse(),
      exception.getResponse(),
      exception.getStatus(),
    );
  }
}
