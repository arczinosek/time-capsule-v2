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
    const fieldErrors = Object.entries(error.fieldErrors).reduce(
      (acc, [field, message]) => {
        if (message) {
          acc[field] = [message];
        }

        return acc;
      },
      {} as Record<string, string[]>
    );

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
