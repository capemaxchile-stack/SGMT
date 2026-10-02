import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { Prisma } from '@prisma/client';

export interface StandardErrorResponse {
  statusCode: number;
  error: string;
  message: string;
}

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaClientExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host?: ArgumentsHost): any {
    const errorPayload = PrismaClientExceptionFilter.formatError(exception);

    if (host && host.switchToHttp) {
      const ctx = host.switchToHttp();
      const response = ctx.getResponse<Response>();
      if (response && typeof response.status === 'function') {
        return response.status(errorPayload.statusCode).json(errorPayload);
      }
    }

    return errorPayload;
  }

  static catch(exception: any): StandardErrorResponse {
    return this.formatError(exception);
  }

  static formatError(exception: any): StandardErrorResponse {
    const code = exception?.code;
    const meta = exception?.meta || {};

    if (code === 'P2002') {
      const target = meta.target
        ? Array.isArray(meta.target)
          ? meta.target.join(', ')
          : meta.target
        : 'field';
      return {
        statusCode: HttpStatus.CONFLICT,
        error: 'Conflict',
        message: `Unique constraint violation on ${target}. A record with this value already exists.`,
      };
    }

    if (code === 'P2003') {
      const field = meta.field_name || 'relation';
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'Bad Request',
        message: `Foreign key constraint failed on ${field}. Referenced record does not exist or has active dependents.`,
      };
    }

    if (code === 'P2025') {
      return {
        statusCode: HttpStatus.NOT_FOUND,
        error: 'Not Found',
        message: meta.cause || 'Record to update or delete does not exist.',
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      message: 'An unexpected database error occurred.',
    };
  }
}
