/**
 * Tier 2: Boundary & Corner Cases — Security & Architecture (SEC-001 to SEC-013)
 * Rigorous boundary verification (limits, zero, negative, invalid inputs, injections) (>= 5 tests per feature)
 */

const { describe, it, expect, beforeEach } = require('../harness');
const { AuthEngine } = require('../harness/auth-engine');
const { AuditEngine } = require('../harness/audit-engine');

describe('Tier 2: Security & Architecture Boundary Cases', () => {
  let authEngine;
  let auditEngine;

  beforeEach(() => {
    authEngine = new AuthEngine({
      jwtSecret: 'boundary-testing-jwt-secret-very-secure-32chars',
      jwtRefreshSecret: 'boundary-testing-jwt-refresh-secret-distinct',
    });
    auditEngine = new AuditEngine();
  });

  // -------------------------------------------------------------
  // Feature 1: SEC-CREDS (Boundary Cases)
  // -------------------------------------------------------------
  describe('Boundary: SEC-CREDS — Extreme Values and Corner Cases in User Sanitization', () => {
    it('SEC-CREDS-B01: User with null superKey does not expose any superKeyHash key', () => {
      authEngine.registerUser({
        id: 'u-null-sk',
        email: 'nullsk@sgmt.cl',
        superKey: null,
        password: 'pass',
      });
      const users = authEngine.findAllActive();
      const found = users.find(u => u.id === 'u-null-sk');
      expect(found).toBeDefined();
      expect('superKeyHash' in found).toBe(false);
      expect('passwordHash' in found).toBe(false);
    });

    it('SEC-CREDS-B02: User with complex Unicode and emoji in password sanitized without error', () => {
      authEngine.registerUser({
        id: 'u-unicode',
        email: 'unicode@sgmt.cl',
        password: '🔒Password_Contraseña_123!@#áéíóú',
      });
      const users = authEngine.findAllActive();
      const found = users.find(u => u.id === 'u-unicode');
      expect('passwordHash' in found).toBe(false);
    });

    it('SEC-CREDS-B03: Serializing sanitized user through JSON.stringify does not reintroduce hashes', () => {
      authEngine.registerUser({ id: 'u-json', email: 'json@sgmt.cl', password: 'pass', superKey: 'sk' });
      const users = authEngine.findAllActive();
      const serialized = JSON.stringify(users[0]);
      expect(serialized).not.toContain('passwordHash');
      expect(serialized).not.toContain('superKeyHash');
    });

    it('SEC-CREDS-B04: Direct property lookup for passwordHash returns undefined', () => {
      authEngine.registerUser({ id: 'u-prop', email: 'prop@sgmt.cl', password: 'pass' });
      const user = authEngine.findAllActive()[0];
      expect(user.passwordHash).toBeUndefined();
    });

    it('SEC-CREDS-B05: Large user dataset (100 users) all strictly sanitized without exception', () => {
      for (let i = 0; i < 100; i++) {
        authEngine.registerUser({
          id: `u-bulk-${i}`,
          email: `bulk${i}@sgmt.cl`,
          password: `pass${i}`,
          superKey: `sk${i}`,
        });
      }
      const users = authEngine.findAllActive();
      expect(users.length).toBe(100);
      expect(users.every(u => !('passwordHash' in u) && !('superKeyHash' in u))).toBe(true);
    });
  });

  // -------------------------------------------------------------
  // Feature 2: SEC-AUDIT-REDACT (Boundary Cases)
  // -------------------------------------------------------------
  describe('Boundary: SEC-AUDIT-REDACT — Extreme and Adversarial Redaction Scenarios', () => {
    it('SEC-AUDIT-REDACT-B01: Case-insensitive variants (sUpErKeY, super_key) are redacted', () => {
      const log = auditEngine.record({
        action: 'TEST',
        entity: 'Auth',
        detail: {
          super_key: 'secret1',
          sUpErKeY: 'secret2',
        },
      });
      expect(log.detail.super_key).toBe('[REDACTED]');
      expect(log.detail.sUpErKeY).toBe('[REDACTED]');
    });

    it('SEC-AUDIT-REDACT-B02: Arrays containing multiple objects with sensitive keys are all redacted', () => {
      const log = auditEngine.record({
        action: 'BATCH_OP',
        entity: 'Batch',
        detail: {
          items: [
            { id: 1, password: 'secret1' },
            { id: 2, superKey: 'secret2' },
          ],
        },
      });
      expect(log.detail.items[0].password).toBe('[REDACTED]');
      expect(log.detail.items[1].superKey).toBe('[REDACTED]');
      expect(log.detail.items[0].id).toBe(1);
    });

    it('SEC-AUDIT-REDACT-B03: Empty string passwords are redacted to [REDACTED]', () => {
      const log = auditEngine.record({
        action: 'EMPTY_PASS',
        entity: 'User',
        detail: { password: '' },
      });
      expect(log.detail.password).toBe('[REDACTED]');
    });

    it('SEC-AUDIT-REDACT-B04: Null, undefined or non-object detail handled cleanly without crash', () => {
      const log1 = auditEngine.record({ action: 'NULL_DETAIL', entity: 'Test', detail: null });
      const log2 = auditEngine.record({ action: 'STRING_DETAIL', entity: 'Test', detail: 'simple string' });
      expect(log1.detail).toBeNull();
      expect(log2.detail).toBe('simple string');
    });

    it('SEC-AUDIT-REDACT-B05: Tokens (accessToken, refreshToken) in detail are redacted', () => {
      const log = auditEngine.record({
        action: 'TOKEN_ISSUE',
        entity: 'Auth',
        detail: {
          accessToken: 'eyJhbGciOi...',
          refreshToken: 'eyJhbGciOi...',
          userId: 'u-1',
        },
      });
      expect(log.detail.accessToken).toBe('[REDACTED]');
      expect(log.detail.refreshToken).toBe('[REDACTED]');
      expect(log.detail.userId).toBe('u-1');
    });
  });

  // -------------------------------------------------------------
  // Feature 3: SEC-JWT-SECRETS (Boundary Cases)
  // -------------------------------------------------------------
  describe('Boundary: SEC-JWT-SECRETS — Invalid Secrets & Malformed Tokens', () => {
    it('SEC-JWT-SECRETS-B01: Empty JWT_SECRET throws error at boot validation', () => {
      expect(() => {
        AuthEngine.validateBootSecrets({ JWT_SECRET: '', JWT_REFRESH_SECRET: 'refresh' });
      }).toThrow('JWT_SECRET must be configured and non-empty');
    });

    it('SEC-JWT-SECRETS-B02: Empty JWT_REFRESH_SECRET throws error at boot validation', () => {
      expect(() => {
        AuthEngine.validateBootSecrets({ JWT_SECRET: 'secret', JWT_REFRESH_SECRET: '' });
      }).toThrow('JWT_REFRESH_SECRET must be configured and non-empty');
    });

    it('SEC-JWT-SECRETS-B03: Mutated signature (1 character altered) throws Invalid signature', () => {
      const token = authEngine.signToken({ sub: 'u1' }, authEngine.jwtSecret);
      const parts = token.split('.');
      parts[2] = parts[2].slice(0, -1) + (parts[2].endsWith('a') ? 'b' : 'a');
      const tampered = parts.join('.');
      expect(() => authEngine.verifyToken(tampered, authEngine.jwtSecret)).toThrow('Invalid signature');
    });

    it('SEC-JWT-SECRETS-B04: Malformed token (missing segments) throws Malformed token', () => {
      expect(() => authEngine.verifyToken('not.a.valid.jwt.token', authEngine.jwtSecret)).toThrow('Malformed token');
      expect(() => authEngine.verifyToken('onlytwoparts.here', authEngine.jwtSecret)).toThrow('Malformed token');
    });

    it('SEC-JWT-SECRETS-B05: Expired token throws Token expired error', () => {
      // Create token with negative expiration (-10 seconds)
      const token = authEngine.signToken({ sub: 'u1' }, authEngine.jwtSecret, -10);
      expect(() => authEngine.verifyToken(token, authEngine.jwtSecret)).toThrow('Token expired');
    });
  });

  // -------------------------------------------------------------
  // Feature 4: SEC-AUTH-STATUS (Boundary Cases)
  // -------------------------------------------------------------
  describe('Boundary: SEC-AUTH-STATUS — Inactive Users & Status Tampering', () => {
    beforeEach(() => {
      authEngine.registerUser({
        id: 'u-inactive',
        email: 'inactive@sgmt.cl',
        password: 'password123',
        isActive: false,
      });
      authEngine.registerUser({
        id: 'u-active',
        email: 'active@sgmt.cl',
        password: 'password123',
        isActive: true,
      });
    });

    it('SEC-AUTH-STATUS-B01: Inactive user login strictly throws Account is inactive', () => {
      expect(() => {
        authEngine.login('inactive@sgmt.cl', 'password123');
      }).toThrow('Account is inactive');
    });

    it('SEC-AUTH-STATUS-B02: Inactive user cannot refresh tokens even with previously signed token', () => {
      const refreshPayload = { sub: 'u-inactive', type: 'refresh' };
      const token = authEngine.signToken(refreshPayload, authEngine.jwtRefreshSecret);
      expect(() => {
        authEngine.refreshToken(token);
      }).toThrow('Account is inactive');
    });

    it('SEC-AUTH-STATUS-B03: User deactivated after login cannot refresh session', () => {
      const loginRes = authEngine.login('active@sgmt.cl', 'password123');
      // Deactivate user in DB
      const user = authEngine.users.get('u-active');
      user.isActive = false;

      expect(() => {
        authEngine.refreshToken(loginRes.refreshToken);
      }).toThrow('Account is inactive');
    });

    it('SEC-AUTH-STATUS-B04: Non-existent user login fails with Invalid credentials without leaking existence', () => {
      expect(() => {
        authEngine.login('doesnotexist@sgmt.cl', 'somepassword');
      }).toThrow('Invalid credentials');
    });

    it('SEC-AUTH-STATUS-B05: Wrong password fails with Invalid credentials', () => {
      expect(() => {
        authEngine.login('active@sgmt.cl', 'wrongpassword');
      }).toThrow('Invalid credentials');
    });
  });

  // -------------------------------------------------------------
  // Feature 5: SEC-RBAC-HARDEN (Boundary Cases)
  // -------------------------------------------------------------
  describe('Boundary: SEC-RBAC-HARDEN — Unauthorized Role Violations & Missing Tokens', () => {
    let tokenSolicitante;

    beforeEach(() => {
      authEngine.registerUser({
        id: 'u-solic-2',
        email: 'solic@sgmt.cl',
        password: 'pass',
        roles: ['SOLICITANTE'],
      });
      tokenSolicitante = authEngine.login('solic@sgmt.cl', 'pass').accessToken;
    });

    it('SEC-RBAC-HARDEN-B01: Request without Bearer token throws Bearer token missing', () => {
      expect(() => {
        authEngine.authorize(null, ['ADMIN']);
      }).toThrow('Bearer token missing');
    });

    it('SEC-RBAC-HARDEN-B02: User lacking required role throws Insufficient permissions', () => {
      expect(() => {
        authEngine.authorize(tokenSolicitante, ['ADMIN']);
      }).toThrow('Insufficient permissions');
    });

    it('SEC-RBAC-HARDEN-B03: User with empty roles array cannot access role-protected endpoint', () => {
      authEngine.registerUser({ id: 'u-no-role', email: 'norole@sgmt.cl', password: 'p', roles: [] });
      const noRoleToken = authEngine.login('norole@sgmt.cl', 'p').accessToken;
      expect(() => {
        authEngine.authorize(noRoleToken, ['USER']);
      }).toThrow('Insufficient permissions');
    });

    it('SEC-RBAC-HARDEN-B04: Role matching is strictly case-sensitive', () => {
      expect(() => {
        authEngine.authorize(tokenSolicitante, ['solicitante']); // Lowercase mismatch
      }).toThrow('Insufficient permissions');
    });

    it('SEC-RBAC-HARDEN-B05: Refresh token cannot be used to authenticate API requests', () => {
      const loginRes = authEngine.login('solic@sgmt.cl', 'pass');
      expect(() => {
        authEngine.authorize(loginRes.refreshToken, ['SOLICITANTE']);
      }).toThrow('Invalid');
    });
  });

  // -------------------------------------------------------------
  // Feature 6: SEC-AUDIT-IMMUTABLE (Boundary Cases)
  // -------------------------------------------------------------
  describe('Boundary: SEC-AUDIT-IMMUTABLE — Protection Against Tampering and Destruction', () => {
    it('SEC-AUDIT-IMMUTABLE-B01: Updating non-existent audit ID is denied by immutability trigger', () => {
      expect(() => {
        auditEngine.update(999999n, { action: 'HACK' });
      }).toThrow('AuditLog records are strictly immutable');
    });

    it('SEC-AUDIT-IMMUTABLE-B02: Deleting non-existent audit ID is denied by immutability trigger', () => {
      expect(() => {
        auditEngine.delete(999999n);
      }).toThrow('AuditLog records are strictly immutable');
    });

    it('SEC-AUDIT-IMMUTABLE-B03: Mutating returned frozen object directly throws in strict mode', () => {
      const log = auditEngine.record({ action: 'FROZEN_TEST', entity: 'Test' });
      expect(Object.isFrozen(log)).toBe(true);
      expect(() => {
        Object.assign(log, { action: 'TAMPERED' });
      }).toThrow('Cannot assign to read only property');
    });

    it('SEC-AUDIT-IMMUTABLE-B04: Attempting to reset current ID or truncate table is denied', () => {
      expect(() => {
        auditEngine.truncate();
      }).toThrow('AuditLog table cannot be truncated');
    });

    it('SEC-AUDIT-IMMUTABLE-B05: Rapid sequence of 50 records preserves strict monotonic ID sequence', () => {
      for (let i = 0; i < 50; i++) {
        auditEngine.record({ action: `ACTION_${i}`, entity: 'Test' });
      }
      const logs = auditEngine.getAll();
      expect(logs.length).toBe(50);
      for (let i = 0; i < 50; i++) {
        expect(logs[i].id).toBe(BigInt(i + 1));
      }
    });
  });

  // -------------------------------------------------------------
  // Feature 7: SEC-AUDIT-COVERAGE (Boundary Cases)
  // -------------------------------------------------------------
  describe('Boundary: SEC-AUDIT-COVERAGE — Edge Metadata and Boundary Queries', () => {
    it('SEC-AUDIT-COVERAGE-B01: Records without IP address store null cleanly without error', () => {
      const log = auditEngine.record({ action: 'ACTION_NO_IP', entity: 'Test', ipAddress: null });
      expect(log.ipAddress).toBeNull();
    });

    it('SEC-AUDIT-COVERAGE-B02: Missing action throws validation error', () => {
      expect(() => {
        auditEngine.record({ action: null, entity: 'Test' });
      }).toThrow('AuditLog entry requires an action');
    });

    it('SEC-AUDIT-COVERAGE-B03: Missing entity throws validation error', () => {
      expect(() => {
        auditEngine.record({ action: 'LOGIN', entity: '' });
      }).toThrow('AuditLog entry requires an entity');
    });

    it('SEC-AUDIT-COVERAGE-B04: Query with non-existent filters returns empty array', () => {
      auditEngine.record({ action: 'LOGIN', entity: 'User', userId: 'u1' });
      const res = auditEngine.query({ userId: 'non-existent-user' });
      expect(Array.isArray(res)).toBe(true);
      expect(res.length).toBe(0);
    });

    it('SEC-AUDIT-COVERAGE-B05: Preserves special characters in action and entity names', () => {
      const log = auditEngine.record({ action: 'ACTION!@#$%^&*()', entity: 'Faena::Mina_Sur' });
      expect(log.action).toBe('ACTION!@#$%^&*()');
      expect(log.entity).toBe('Faena::Mina_Sur');
    });
  });

  // -------------------------------------------------------------
  // Feature 8: SEC-DTO-VALIDATE (Boundary Cases)
  // -------------------------------------------------------------
  describe('Boundary: SEC-DTO-VALIDATE — Injections, Empty Payloads & Type Corruptions', () => {
    const allowed = ['email', 'quantity'];
    const required = ['email'];

    it('SEC-DTO-VALIDATE-B01: Injected property throws non-whitelisted property error', () => {
      expect(() => {
        authEngine.validateDto({ email: 'a@b.com', hackField: true }, allowed, required);
      }).toThrow('non-whitelisted property');
    });

    it('SEC-DTO-VALIDATE-B02: Null payload throws valid JSON object error', () => {
      expect(() => {
        authEngine.validateDto(null, allowed, required);
      }).toThrow('Payload must be a valid JSON object');
    });

    it('SEC-DTO-VALIDATE-B03: Empty string on required field throws missing or empty error', () => {
      expect(() => {
        authEngine.validateDto({ email: '' }, allowed, required);
      }).toThrow('is missing or empty');
    });

    it('SEC-DTO-VALIDATE-B04: Undefined on required field throws missing error', () => {
      expect(() => {
        authEngine.validateDto({ email: undefined }, allowed, required);
      }).toThrow('is missing or empty');
    });

    it('SEC-DTO-VALIDATE-B05: Payload with uppercase / unexpected property names rejected', () => {
      expect(() => {
        authEngine.validateDto({ EMAIL: 'a@b.com' }, allowed, required);
      }).toThrow('non-whitelisted property');
    });
  });
});
