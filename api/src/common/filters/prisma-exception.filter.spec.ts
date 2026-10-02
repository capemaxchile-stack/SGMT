import { HttpStatus } from '@nestjs/common';
import { PrismaClientExceptionFilter } from './prisma-exception.filter';

describe('PrismaClientExceptionFilter', () => {
  it('translates P2002 unique constraint violation to 409 Conflict with target fields', () => {
    const error = {
      code: 'P2002',
      meta: { target: ['itemId', 'warehouseId'] },
    };

    const result = PrismaClientExceptionFilter.catch(error);
    expect(result.statusCode).toBe(HttpStatus.CONFLICT);
    expect(result.error).toBe('Conflict');
    expect(result.message).toContain('itemId, warehouseId');
    expect(result.message).toContain('Unique constraint violation');
  });

  it('translates P2003 foreign key violation to 400 Bad Request with field name', () => {
    const error = {
      code: 'P2003',
      meta: { field_name: 'warehouseId' },
    };

    const result = PrismaClientExceptionFilter.catch(error);
    expect(result.statusCode).toBe(HttpStatus.BAD_REQUEST);
    expect(result.error).toBe('Bad Request');
    expect(result.message).toContain('warehouseId');
    expect(result.message).toContain('Foreign key constraint failed');
  });

  it('translates P2003 foreign key violation without metadata cleanly to default message', () => {
    const error = {
      code: 'P2003',
      meta: {},
    };

    const result = PrismaClientExceptionFilter.catch(error);
    expect(result.statusCode).toBe(HttpStatus.BAD_REQUEST);
    expect(result.message).toContain('relation');
  });

  it('translates P2025 record not found to 404 Not Found', () => {
    const error = {
      code: 'P2025',
      meta: { cause: 'Record with ID not found' },
    };

    const result = PrismaClientExceptionFilter.catch(error);
    expect(result.statusCode).toBe(HttpStatus.NOT_FOUND);
    expect(result.error).toBe('Not Found');
    expect(result.message).toBe('Record with ID not found');
  });

  it('translates unknown error code to 500 Internal Server Error without leaking details', () => {
    const error = {
      code: 'P9999',
      message: 'postgres://user:password@localhost:5432/db',
    };

    const result = PrismaClientExceptionFilter.catch(error);
    expect(result.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(result.error).toBe('Internal Server Error');
    expect(result.message).not.toContain('password');
  });
});
