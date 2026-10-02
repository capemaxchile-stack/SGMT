/**
 * Tier 1: Feature Coverage — Security & Architecture (SEC-001 to SEC-013)
 * Comprehensive happy path verification in isolation (>= 5 tests per feature)
 */

const { describe, it, expect, beforeEach } = require('../harness');
const { AuthEngine } = require('../harness/auth-engine');
const { AuditEngine } = require('../harness/audit-engine');

describe('Tier 1: Security & Architecture Features', () => {
  let authEngine;
  let auditEngine;

  beforeEach(() => {
    authEngine = new AuthEngine({
      jwtSecret: 'prod-grade-jwt-secret-key-32-chars-long!',
      jwtRefreshSecret: 'prod-grade-jwt-refresh-secret-distinct!',
    });
    auditEngine = new AuditEngine();
  });

  // -------------------------------------------------------------
  // Feature 1: SEC-CREDS (Sanitize findAllActive)
  // -------------------------------------------------------------
  describe('Feature: SEC-CREDS — Sanitize User Credentials', () => {
    beforeEach(() => {
      authEngine.registerUser({
        id: 'user-admin-1',
        email: 'admin@sgmt.cl',
        name: 'Administrador SGMT',
        rut: '11.111.111-1',
        password: 'adminPassword123',
        superKey: 'superSecretKey999',
        isActive: true,
        roles: ['ADMIN'],
      });
      authEngine.registerUser({
        id: 'user-bodega-1',
        email: 'bodega@sgmt.cl',
        name: 'Jefe de Bodega',
        rut: '22.222.222-2',
        password: 'bodegaPassword456',
        superKey: null,
        isActive: true,
        roles: ['BODEGA'],
      });
      authEngine.registerUser({
        id: 'user-inactive-1',
        email: 'inactive@sgmt.cl',
        name: 'Ex Empleado',
        isActive: false,
        roles: ['SOLICITANTE'],
      });
    });

    it('SEC-CREDS-01: findAllActive returns list containing only active users', () => {
      const users = authEngine.findAllActive();
      expect(users.length).toBe(2);
      expect(users.every(u => u.isActive === true)).toBe(true);
    });

    it('SEC-CREDS-02: findAllActive completely removes passwordHash from all objects', () => {
      const users = authEngine.findAllActive();
      for (const u of users) {
        expect(u.passwordHash).toBeUndefined();
        expect('passwordHash' in u).toBe(false);
      }
    });

    it('SEC-CREDS-03: findAllActive completely removes superKeyHash from all objects', () => {
      const users = authEngine.findAllActive();
      for (const u of users) {
        expect(u.superKeyHash).toBeUndefined();
        expect('superKeyHash' in u).toBe(false);
      }
    });

    it('SEC-CREDS-04: findAllActive preserves safe summary attributes (id, email, name, rut, roles)', () => {
      const users = authEngine.findAllActive();
      const admin = users.find(u => u.id === 'user-admin-1');
      expect(admin).toBeDefined();
      expect(admin.email).toBe('admin@sgmt.cl');
      expect(admin.name).toBe('Administrador SGMT');
      expect(admin.rut).toBe('11.111.111-1');
      expect(admin.roles).toContain('ADMIN');
    });

    it('SEC-CREDS-05: Deactivated users are strictly excluded from findAllActive', () => {
      const users = authEngine.findAllActive();
      const inactiveUser = users.find(u => u.id === 'user-inactive-1');
      expect(inactiveUser).toBeUndefined();
    });
  });

  // -------------------------------------------------------------
  // Feature 2: SEC-AUDIT-REDACT (Redact credentials in AuditLog)
  // -------------------------------------------------------------
  describe('Feature: SEC-AUDIT-REDACT — Redact Sensitive Keys in AuditLog', () => {
    it('SEC-AUDIT-REDACT-01: Redacts superKey to [REDACTED] in mutation detail', () => {
      const log = auditEngine.record({
        action: 'ORDER_APPROVE_EXCEPTION',
        entity: 'PurchaseOrder',
        entityId: 'oc-001',
        detail: {
          orderId: 'oc-001',
          superKey: 'raw_super_secret_key_123',
          approverId: 'user-admin-1',
        },
      });
      expect(log.detail.superKey).toBe('[REDACTED]');
      expect(log.detail.orderId).toBe('oc-001');
    });

    it('SEC-AUDIT-REDACT-02: Redacts password in user registration or update', () => {
      const log = auditEngine.record({
        action: 'USER_CREATE',
        entity: 'User',
        entityId: 'user-new-1',
        detail: {
          email: 'newuser@sgmt.cl',
          password: 'plainSecretPassword',
        },
      });
      expect(log.detail.password).toBe('[REDACTED]');
      expect(log.detail.email).toBe('newuser@sgmt.cl');
    });

    it('SEC-AUDIT-REDACT-03: Redacts passwordHash and superKeyHash if present in detail', () => {
      const log = auditEngine.record({
        action: 'USER_UPDATE',
        entity: 'User',
        entityId: 'user-001',
        detail: {
          passwordHash: '$2b$10$encryptedPasswordHash',
          superKeyHash: '$2b$10$encryptedSuperKeyHash',
          name: 'Updated Name',
        },
      });
      expect(log.detail.passwordHash).toBe('[REDACTED]');
      expect(log.detail.superKeyHash).toBe('[REDACTED]');
      expect(log.detail.name).toBe('Updated Name');
    });

    it('SEC-AUDIT-REDACT-04: Recursively redacts sensitive keys in deeply nested objects', () => {
      const log = auditEngine.record({
        action: 'SECURITY_EVENT',
        entity: 'Auth',
        detail: {
          request: {
            authPayload: {
              credentials: {
                superKey: 'deep-secret-key',
                token: 'bearer-token',
              },
            },
          },
        },
      });
      expect(log.detail.request.authPayload.credentials.superKey).toBe('[REDACTED]');
    });

    it('SEC-AUDIT-REDACT-05: Preserves safe operational metadata unchanged', () => {
      const log = auditEngine.record({
        action: 'MOVEMENT_CREATE',
        entity: 'WarehouseMovement',
        entityId: 'mov-100',
        detail: {
          type: 'INGRESO',
          warehouseId: 'wh-central',
          quantity: 150,
          totalAmount: 450000,
        },
      });
      expect(log.detail.type).toBe('INGRESO');
      expect(log.detail.quantity).toBe(150);
      expect(log.detail.totalAmount).toBe(450000);
    });
  });

  // -------------------------------------------------------------
  // Feature 3: SEC-JWT-SECRETS (Strict Secrets & Separate Refresh)
  // -------------------------------------------------------------
  describe('Feature: SEC-JWT-SECRETS — Strict JWT Secret Validation & Refresh Separation', () => {
    it('SEC-JWT-SECRETS-01: Validates boot environment when distinct, strong secrets are provided', () => {
      const env = {
        JWT_SECRET: 'production-access-token-secret-strong-123',
        JWT_REFRESH_SECRET: 'production-refresh-token-secret-strong-456',
      };
      const result = AuthEngine.validateBootSecrets(env);
      expect(result).toBe(true);
    });

    it('SEC-JWT-SECRETS-02: Rejects boot if JWT_SECRET equals default insecure placeholder', () => {
      const env = {
        JWT_SECRET: 'default_secret_key_change_me_in_prod',
        JWT_REFRESH_SECRET: 'another-secret',
      };
      expect(() => AuthEngine.validateBootSecrets(env)).toThrow('Insecure default JWT_SECRET is prohibited');
    });

    it('SEC-JWT-SECRETS-03: Rejects boot if JWT_SECRET equals JWT_REFRESH_SECRET', () => {
      const env = {
        JWT_SECRET: 'same-shared-secret-12345',
        JWT_REFRESH_SECRET: 'same-shared-secret-12345',
      };
      expect(() => AuthEngine.validateBootSecrets(env)).toThrow('distinct secrets');
    });

    it('SEC-JWT-SECRETS-04: Signs access token verifiable only with access secret', () => {
      const payload = { sub: 'user-1', email: 'test@sgmt.cl', roles: ['USER'], type: 'access' };
      const token = authEngine.signToken(payload, authEngine.jwtSecret);
      const verified = authEngine.verifyToken(token, authEngine.jwtSecret);
      expect(verified.sub).toBe('user-1');
      expect(verified.type).toBe('access');
    });

    it('SEC-JWT-SECRETS-05: Refresh token cannot be verified with access token secret', () => {
      const token = authEngine.signToken({ sub: 'user-1', type: 'refresh' }, authEngine.jwtRefreshSecret);
      expect(() => authEngine.verifyToken(token, authEngine.jwtSecret)).toThrow('Invalid signature');
    });
  });

  // -------------------------------------------------------------
  // Feature 4: SEC-AUTH-STATUS (Enforce isActive on Login & Refresh)
  // -------------------------------------------------------------
  describe('Feature: SEC-AUTH-STATUS — Enforce isActive on Login and Refresh', () => {
    beforeEach(() => {
      authEngine.registerUser({
        id: 'user-active-1',
        email: 'active@sgmt.cl',
        password: 'ValidPassword123!',
        isActive: true,
        roles: ['BODEGA'],
      });
    });

    it('SEC-AUTH-STATUS-01: Active user logs in successfully with valid credentials', () => {
      const res = authEngine.login('active@sgmt.cl', 'ValidPassword123!');
      expect(res.accessToken).toBeDefined();
      expect(res.refreshToken).toBeDefined();
      expect(res.user.email).toBe('active@sgmt.cl');
    });

    it('SEC-AUTH-STATUS-02: Login response contains sanitized user without passwordHash', () => {
      const res = authEngine.login('active@sgmt.cl', 'ValidPassword123!');
      expect(res.user.passwordHash).toBeUndefined();
      expect(res.user.superKeyHash).toBeUndefined();
    });

    it('SEC-AUTH-STATUS-03: Active user successfully refreshes session with valid refresh token', () => {
      const loginRes = authEngine.login('active@sgmt.cl', 'ValidPassword123!');
      const refreshRes = authEngine.refreshToken(loginRes.refreshToken);
      expect(refreshRes.accessToken).toBeDefined();
      expect(refreshRes.refreshToken).toBeDefined();
    });

    it('SEC-AUTH-STATUS-04: User status reflects correctly in issued access token claims', () => {
      const loginRes = authEngine.login('active@sgmt.cl', 'ValidPassword123!');
      const verified = authEngine.verifyToken(loginRes.accessToken, authEngine.jwtSecret);
      expect(verified.sub).toBe('user-active-1');
      expect(verified.roles).toContain('BODEGA');
    });

    it('SEC-AUTH-STATUS-05: Active user can perform repeated successful logins', () => {
      const res1 = authEngine.login('active@sgmt.cl', 'ValidPassword123!');
      const res2 = authEngine.login('active@sgmt.cl', 'ValidPassword123!');
      expect(res1.accessToken).toBeDefined();
      expect(res2.accessToken).toBeDefined();
    });
  });

  // -------------------------------------------------------------
  // Feature 5: SEC-RBAC-HARDEN (Fail-Closed RolesGuard)
  // -------------------------------------------------------------
  describe('Feature: SEC-RBAC-HARDEN — Fail-Closed RolesGuard & Endpoint Authorization', () => {
    let adminToken;
    let bodegaToken;
    let solicitanteToken;

    beforeEach(() => {
      authEngine.registerUser({
        id: 'u-admin',
        email: 'adm@sgmt.cl',
        password: 'pass',
        roles: ['ADMIN'],
      });
      authEngine.registerUser({
        id: 'u-bodega',
        email: 'bod@sgmt.cl',
        password: 'pass',
        roles: ['BODEGA'],
      });
      authEngine.registerUser({
        id: 'u-solic',
        email: 'sol@sgmt.cl',
        password: 'pass',
        roles: ['SOLICITANTE'],
      });

      adminToken = authEngine.login('adm@sgmt.cl', 'pass').accessToken;
      bodegaToken = authEngine.login('bod@sgmt.cl', 'pass').accessToken;
      solicitanteToken = authEngine.login('sol@sgmt.cl', 'pass').accessToken;
    });

    it('SEC-RBAC-HARDEN-01: ADMIN role authorized for administrative endpoints', () => {
      const payload = authEngine.authorize(adminToken, ['ADMIN']);
      expect(payload.sub).toBe('u-admin');
    });

    it('SEC-RBAC-HARDEN-02: BODEGA role authorized for warehouse movement endpoints', () => {
      const payload = authEngine.authorize(bodegaToken, ['BODEGA', 'ADMIN']);
      expect(payload.sub).toBe('u-bodega');
    });

    it('SEC-RBAC-HARDEN-03: SOLICITANTE authorized for field request endpoints', () => {
      const payload = authEngine.authorize(solicitanteToken, ['SOLICITANTE', 'ADMIN']);
      expect(payload.sub).toBe('u-solic');
    });

    it('SEC-RBAC-HARDEN-04: Multiple allowed roles permits any matching role', () => {
      expect(authEngine.authorize(adminToken, ['BODEGA', 'ADMIN', 'GERENCIA'])).toBeDefined();
      expect(authEngine.authorize(bodegaToken, ['BODEGA', 'ADMIN', 'GERENCIA'])).toBeDefined();
    });

    it('SEC-RBAC-HARDEN-05: Unprotected public route succeeds when auth is optional', () => {
      const result = authEngine.authorize(null, [], false);
      expect(result).toBe(true);
    });
  });

  // -------------------------------------------------------------
  // Feature 6: SEC-AUDIT-IMMUTABLE (PostgreSQL Trigger/Rule Emulation)
  // -------------------------------------------------------------
  describe('Feature: SEC-AUDIT-IMMUTABLE — PostgreSQL AuditLog Immutability', () => {
    it('SEC-AUDIT-IMMUTABLE-01: Allows inserting sequential audit entries', () => {
      const log1 = auditEngine.record({ action: 'LOGIN', entity: 'User', userId: 'u1' });
      const log2 = auditEngine.record({ action: 'LOGOUT', entity: 'User', userId: 'u1' });
      expect(log1.id).toBe(1n);
      expect(log2.id).toBe(2n);
    });

    it('SEC-AUDIT-IMMUTABLE-02: Rejects any UPDATE statement on AuditLog', () => {
      const log = auditEngine.record({ action: 'LOGIN', entity: 'User', userId: 'u1' });
      expect(() => {
        auditEngine.update(log.id, { action: 'TAMPERED_ACTION' });
      }).toThrow('Permission denied. AuditLog records are strictly immutable and cannot be updated');
    });

    it('SEC-AUDIT-IMMUTABLE-03: Rejects any DELETE statement on AuditLog records', () => {
      const log = auditEngine.record({ action: 'LOGIN', entity: 'User', userId: 'u1' });
      expect(() => {
        auditEngine.delete(log.id);
      }).toThrow('Permission denied. AuditLog records are strictly immutable and cannot be deleted');
    });

    it('SEC-AUDIT-IMMUTABLE-04: Rejects TRUNCATE or bulk destruction of AuditLog table', () => {
      auditEngine.record({ action: 'LOGIN', entity: 'User' });
      expect(() => {
        auditEngine.truncate();
      }).toThrow('AuditLog table cannot be truncated');
    });

    it('SEC-AUDIT-IMMUTABLE-05: Read queries on AuditLog return unchanged historical records', () => {
      auditEngine.record({ action: 'ACTION_A', entity: 'Item', entityId: 'item-1' });
      auditEngine.record({ action: 'ACTION_B', entity: 'Item', entityId: 'item-2' });
      const logs = auditEngine.getAll();
      expect(logs.length).toBe(2);
      expect(logs[0].action).toBe('ACTION_A');
      expect(logs[1].action).toBe('ACTION_B');
    });
  });

  // -------------------------------------------------------------
  // Feature 7: SEC-AUDIT-COVERAGE (Comprehensive Audit Coverage)
  // -------------------------------------------------------------
  describe('Feature: SEC-AUDIT-COVERAGE — Comprehensive Audit Event Coverage', () => {
    it('SEC-AUDIT-COVERAGE-01: Records audit event on user login', () => {
      const log = auditEngine.record({
        action: 'LOGIN',
        entity: 'User',
        userId: 'u-1',
        ipAddress: '192.168.1.100',
        detail: { email: 'user@sgmt.cl' },
      });
      expect(log.action).toBe('LOGIN');
      expect(log.userId).toBe('u-1');
      expect(log.ipAddress).toBe('192.168.1.100');
    });

    it('SEC-AUDIT-COVERAGE-02: Records audit event on token refresh', () => {
      const log = auditEngine.record({
        action: 'REFRESH_TOKEN',
        entity: 'Auth',
        userId: 'u-1',
        detail: { grantType: 'refresh_token' },
      });
      expect(log.action).toBe('REFRESH_TOKEN');
      expect(log.entity).toBe('Auth');
    });

    it('SEC-AUDIT-COVERAGE-03: Records audit event on warehouse stock movement creation', () => {
      const log = auditEngine.record({
        action: 'MOVEMENT_CREATE',
        entity: 'WarehouseMovement',
        entityId: 'MOV-202610-0001',
        userId: 'u-bodega',
        detail: { type: 'INGRESO', quantity: 50, itemId: 'item-filt-01' },
      });
      expect(log.action).toBe('MOVEMENT_CREATE');
      expect(log.entityId).toBe('MOV-202610-0001');
    });

    it('SEC-AUDIT-COVERAGE-04: Records audit event on Purchase Order state transition', () => {
      const log = auditEngine.record({
        action: 'ORDER_STATUS_CHANGE',
        entity: 'PurchaseOrder',
        entityId: 'OC-202610-0001',
        userId: 'u-approver',
        detail: { fromStatus: 'PENDIENTE_APROBACION', toStatus: 'APROBADA' },
      });
      expect(log.action).toBe('ORDER_STATUS_CHANGE');
      expect(log.detail.toStatus).toBe('APROBADA');
    });

    it('SEC-AUDIT-COVERAGE-05: Audit logs can be queried by action and entity filters', () => {
      auditEngine.record({ action: 'LOGIN', entity: 'User', userId: 'u-1' });
      auditEngine.record({ action: 'ORDER_STATUS_CHANGE', entity: 'PurchaseOrder', userId: 'u-2' });
      auditEngine.record({ action: 'LOGIN', entity: 'User', userId: 'u-3' });

      const loginLogs = auditEngine.query({ action: 'LOGIN' });
      expect(loginLogs.length).toBe(2);
      expect(loginLogs.every(l => l.action === 'LOGIN')).toBe(true);
    });
  });

  // -------------------------------------------------------------
  // Feature 8: SEC-DTO-VALIDATE (Whitelist & ValidationPipe)
  // -------------------------------------------------------------
  describe('Feature: SEC-DTO-VALIDATE — Strict DTO Whitelist & Validation', () => {
    const allowedUserDto = ['email', 'name', 'rut', 'password', 'roles'];
    const requiredUserDto = ['email', 'name', 'password'];

    it('SEC-DTO-VALIDATE-01: Valid payload with exact allowed fields passes validation', () => {
      const payload = {
        email: 'newuser@sgmt.cl',
        name: 'Nuevo Usuario',
        password: 'SecurePassword123',
        rut: '12.345.678-9',
        roles: ['OPERADOR'],
      };
      expect(authEngine.validateDto(payload, allowedUserDto, requiredUserDto)).toBe(true);
    });

    it('SEC-DTO-VALIDATE-02: Valid payload with only required fields passes validation', () => {
      const payload = {
        email: 'newuser@sgmt.cl',
        name: 'Nuevo Usuario',
        password: 'SecurePassword123',
      };
      expect(authEngine.validateDto(payload, allowedUserDto, requiredUserDto)).toBe(true);
    });

    it('SEC-DTO-VALIDATE-03: Rejects payload containing unwhitelisted property', () => {
      const payload = {
        email: 'newuser@sgmt.cl',
        name: 'Nuevo Usuario',
        password: 'SecurePassword123',
        isAdmin: true, // Non-whitelisted malicious injection
      };
      expect(() => {
        authEngine.validateDto(payload, allowedUserDto, requiredUserDto);
      }).toThrow('non-whitelisted property');
    });

    it('SEC-DTO-VALIDATE-04: Rejects payload missing mandatory required property', () => {
      const payload = {
        name: 'Missing Email User',
        password: 'SecurePassword123',
      };
      expect(() => {
        authEngine.validateDto(payload, allowedUserDto, requiredUserDto);
      }).toThrow('Required field "email" is missing');
    });

    it('SEC-DTO-VALIDATE-05: Rejects non-object or array payloads', () => {
      expect(() => {
        authEngine.validateDto(['array', 'not', 'allowed'], allowedUserDto, requiredUserDto);
      }).toThrow('Payload must be a valid JSON object');
    });
  });
});
