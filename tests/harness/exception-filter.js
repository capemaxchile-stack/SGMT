/**
 * Prisma Exception Filter & Soft-Delete Domain Engine (Opaque-Box Contract)
 * Verifies LOGIC-DB-FILTER and LOGIC-SOFT-DELETE
 */

class PrismaClientExceptionFilter {
  static catch(exception) {
    const code = exception.code;
    const meta = exception.meta || {};

    if (code === 'P2002') {
      // Unique constraint failed
      const target = meta.target ? (Array.isArray(meta.target) ? meta.target.join(', ') : meta.target) : 'field';
      return {
        statusCode: 409,
        error: 'Conflict',
        message: `Unique constraint violation on ${target}. A record with this value already exists.`,
      };
    }

    if (code === 'P2003') {
      // Foreign key constraint failed
      const field = meta.field_name || 'relation';
      return {
        statusCode: 400,
        error: 'Bad Request',
        message: `Foreign key constraint failed on ${field}. Referenced record does not exist or has active dependents.`,
      };
    }

    if (code === 'P2025') {
      // Record not found
      return {
        statusCode: 404,
        error: 'Not Found',
        message: meta.cause || 'Record to update or delete does not exist.',
      };
    }

    // Default internal server error
    return {
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'An unexpected database error occurred.',
    };
  }
}

class EntityManager {
  constructor() {
    this.entities = new Map();
  }

  create(collection, data) {
    const id = data.id || crypto.randomUUID();
    const record = { ...data, id, isActive: true, createdAt: new Date().toISOString() };
    const key = `${collection}_${id}`;
    this.entities.set(key, record);
    return record;
  }

  // LOGIC-SOFT-DELETE: Mark isActive: false instead of deleting physically
  softDelete(collection, id) {
    const key = `${collection}_${id}`;
    const record = this.entities.get(key);
    if (!record) {
      const err = new Error('Record not found');
      err.code = 'P2025';
      err.meta = { cause: `${collection} with id ${id} not found` };
      throw err;
    }

    if (!record.isActive) {
      // Already inactive
      return { ...record };
    }

    record.isActive = false;
    record.deletedAt = new Date().toISOString();
    return { ...record };
  }

  // Hard delete simulation (to verify it throws P2003 if referenced)
  hardDelete(collection, id, hasDependents = false) {
    const key = `${collection}_${id}`;
    const record = this.entities.get(key);
    if (!record) {
      const err = new Error('Record not found');
      err.code = 'P2025';
      throw err;
    }

    if (hasDependents) {
      const err = new Error('Foreign key violation');
      err.code = 'P2003';
      err.meta = { field_name: `${collection}Id` };
      throw err;
    }

    this.entities.delete(key);
    return true;
  }

  findActive(collection) {
    const results = [];
    for (const [key, val] of this.entities.entries()) {
      if (key.startsWith(collection + '_') && val.isActive) {
        results.push(val);
      }
    }
    return results;
  }
}

module.exports = { PrismaClientExceptionFilter, EntityManager };
