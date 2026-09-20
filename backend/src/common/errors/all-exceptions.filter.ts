import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { DomainError } from './domain-errors';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'UNKNOWN';
    let message = 'Ocurrió un error inesperado.';
    let details: any = undefined;

    if (exception instanceof DomainError) {
      status = exception.status;
      code = exception.code;
      message = exception.message;
      details = exception.details;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse() as any;
      
      if (status === HttpStatus.BAD_REQUEST) {
        code = 'VALIDATION_ERROR';
        message = 'Hay campos inválidos.';
        details = exceptionResponse.message; // From ValidationPipe
      } else if (status === HttpStatus.TOO_MANY_REQUESTS) {
        code = 'TOO_MANY_REQUESTS';
        message = 'Demasiados intentos. Intenta más tarde.';
      } else {
        message = exception.message;
        code = exceptionResponse.error ? exceptionResponse.error.toUpperCase().replace(/\s+/g, '_') : 'UNKNOWN';
      }
    } else {
      console.error(exception);
    }

    response.status(status).json({ status, code, message, details });
  }
}