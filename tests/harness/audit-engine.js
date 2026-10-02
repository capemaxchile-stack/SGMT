/**
 * AuditLog Domain Engine (Opaque-Box Contract)
 * Verifies SEC-AUDIT-REDACT, SEC-AUDIT-IMMUTABLE, SEC-AUDIT-COVERAGE
 */

class AuditEngine {
  constructor() {
    this.logs = [];
    this.currentId = 1n;
    this.immutableRuleEnabled = true; // PostgreSQL trigger/rule emulation
  }

  // Redaction helper for sensitive fields (SEC-AUDIT-REDACT)
  static redactDetail(data) {
    if (!data || typeof data !== 'object') {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => AuditEngine.redactDetail(item));
    }

    const sensitiveKeys = [
      'superkey',
      'superKey',
      'super_key',
      'password',
      'passwordHash',
      'superKeyHash',
      'refreshToken',
      'accessToken',
      'secret',
    ];

    const clean = {};
    for (const [key, value] of Object.entries(data)) {
      if (sensitiveKeys.includes(key.toLowerCase()) || sensitiveKeys.includes(key)) {
        clean[key] = '[REDACTED]';
      } else if (value && typeof value === 'object') {
        clean[key] = AuditEngine.redactDetail(value);
      } else {
        clean[key] = value;
      }
    }
    return clean;
  }

  // Record an audit log entry (SEC-AUDIT-COVERAGE & SEC-AUDIT-REDACT)
  record(entry) {
    if (!entry.action) {
      throw new Error('AuditLog entry requires an action');
    }
    if (!entry.entity) {
      throw new Error('AuditLog entry requires an entity');
    }

    const redactedDetail = entry.detail ? AuditEngine.redactDetail(entry.detail) : null;

    const log = Object.freeze({
      id: this.currentId++,
      timestamp: new Date().toISOString(),
      userId: entry.userId || null,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId || null,
      detail: redactedDetail,
      ipAddress: entry.ipAddress || null,
    });

    this.logs.push(log);
    return log;
  }

  // Attempted UPDATE on AuditLog (SEC-AUDIT-IMMUTABLE)
  update(id, updates) {
    if (this.immutableRuleEnabled) {
      throw new Error('Database Error: Permission denied. AuditLog records are strictly immutable and cannot be updated.');
    }
    const idx = this.logs.findIndex(l => l.id === id);
    if (idx === -1) throw new Error('Not found');
    this.logs[idx] = { ...this.logs[idx], ...updates };
  }

  // Attempted DELETE on AuditLog (SEC-AUDIT-IMMUTABLE)
  delete(id) {
    if (this.immutableRuleEnabled) {
      throw new Error('Database Error: Permission denied. AuditLog records are strictly immutable and cannot be deleted.');
    }
    const idx = this.logs.findIndex(l => l.id === id);
    if (idx === -1) throw new Error('Not found');
    this.logs.splice(idx, 1);
  }

  // Attempted TRUNCATE or bulk delete (SEC-AUDIT-IMMUTABLE)
  truncate() {
    if (this.immutableRuleEnabled) {
      throw new Error('Database Error: Permission denied. AuditLog table cannot be truncated or dropped.');
    }
    this.logs = [];
  }

  query(filter = {}) {
    return this.logs.filter(log => {
      if (filter.userId && log.userId !== filter.userId) return false;
      if (filter.action && log.action !== filter.action) return false;
      if (filter.entity && log.entity !== filter.entity) return false;
      if (filter.entityId && log.entityId !== filter.entityId) return false;
      return true;
    });
  }

  getAll() {
    return [...this.logs];
  }
}

module.exports = { AuditEngine };
