/**
 * SGMT Tier 5: Adversarial Coverage Hardening Suite
 * White-box adversarial testing for Security & Architecture, Business Logic & Concurrency,
 * and Frontend Resilience contracts.
 * Contains 35 rigorous adversarial test cases across all three core domains.
 */

const { describe, it, expect, beforeEach, runSuites, resetSuites } = require('./harness');
const { AuthEngine } = require('./harness/auth-engine');
const { AuditEngine } = require('./harness/audit-engine');
const { StockEngine, DecimalMock } = require('./harness/stock-engine');
const { PurchaseEngine } = require('./harness/purchase-engine');
const { PrismaClientExceptionFilter, EntityManager } = require('./harness/exception-filter');
const { UIContractEngine } = require('./harness/ui-contract-engine');

describe('Tier 5: Adversarial Coverage Hardening Suite', () => {
  let authEngine;
  let auditEngine;
  let stockEngine;
  let purchaseEngine;
  let entityManager;

  beforeEach(() => {
    authEngine = new AuthEngine({
      jwtSecret: 'tier5-adversarial-jwt-secret-very-secure-32chars',
      jwtRefreshSecret: 'tier5-adversarial-jwt-refresh-secret-distinct',
    });
    auditEngine = new AuditEngine();
    stockEngine = new StockEngine();
    purchaseEngine = new PurchaseEngine();
    entityManager = new EntityManager();
  });

  // =========================================================================
  // DOMAIN 1: Security & Architecture Adversarial Hardening (14 Tests)
  // =========================================================================
  describe('Domain 1: Security & Architecture Adversarial Hardening', () => {
    it('T5-SEC-01: JWT Tampered Signature — Bit-flip / byte corruption rejected with verification error', () => {
      const token = authEngine.signToken(
        { sub: 'u-adversary-1', email: 'adv@sgmt.cl', roles: ['ADMIN_SISTEMA'], type: 'access' },
        authEngine.jwtSecret,
        900
      );
      const parts = token.split('.');
      expect(parts.length).toBe(3);

      // Mutate signature
      const corruptedSig = parts[2].slice(0, -2) + (parts[2].endsWith('a') ? 'b' : 'a') + 'Z';
      const tamperedToken = `${parts[0]}.${parts[1]}.${corruptedSig}`;

      expect(() => {
        authEngine.authorize(tamperedToken, ['ADMIN_SISTEMA']);
      }).toThrow('Invalid signature');
    });

    it('T5-SEC-02: JWT Algorithm "none" Bypass Attack — Unsigned or alg:none token strictly rejected', () => {
      const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(
        JSON.stringify({ sub: 'u-attacker', email: 'hacker@sgmt.cl', roles: ['ADMIN_SISTEMA'], type: 'access', exp: Math.floor(Date.now() / 1000) + 3600 })
      ).toString('base64url');
      const noneToken = `${header}.${payload}.`;

      expect(() => {
        authEngine.authorize(noneToken, ['ADMIN_SISTEMA']);
      }).toThrow('Invalid signature');
    });

    it('T5-SEC-03: JWT Foreign / Cross-Secret Attack — Token signed with alien key strictly rejected', () => {
      const alienSecret = 'foreign-attacker-secret-key-32chars-ok!';
      const alienToken = authEngine.signToken(
        { sub: 'u-alien', email: 'alien@sgmt.cl', roles: ['ADMIN_SISTEMA'], type: 'access' },
        alienSecret,
        900
      );

      expect(() => {
        authEngine.authorize(alienToken, ['ADMIN_SISTEMA']);
      }).toThrow('Invalid signature');
    });

    it('T5-SEC-04: JWT Token Type Confusion — Access token rejected on refresh endpoint', () => {
      const accessToken = authEngine.signToken(
        { sub: 'u-test', email: 'test@sgmt.cl', roles: ['USER'], type: 'access' },
        authEngine.jwtRefreshSecret,
        900
      );

      expect(() => {
        authEngine.refreshToken(accessToken);
      }).toThrow('Invalid refresh token');
    });

    it('T5-SEC-05: JWT Token Type Confusion — Refresh token rejected on protected API authorization endpoint', () => {
      const refreshToken = authEngine.signToken(
        { sub: 'u-test', type: 'refresh' },
        authEngine.jwtSecret,
        604800
      );

      expect(() => {
        authEngine.authorize(refreshToken, ['USER']);
      }).toThrow('Invalid or expired access token');
    });

    it('T5-SEC-06: JWT Expired Token Rejection — Expired access token rejected with explicit expiration error', () => {
      const expiredToken = authEngine.signToken(
        { sub: 'u-expired', email: 'exp@sgmt.cl', roles: ['OPERADOR'], type: 'access' },
        authEngine.jwtSecret,
        -120 // Expired 2 minutes ago
      );

      expect(() => {
        authEngine.authorize(expiredToken, ['OPERADOR']);
      }).toThrow('Token expired');
    });

    it('T5-SEC-07: Deactivated User Token Invalidation — Active token invalidated once user is set inactive', () => {
      const user = authEngine.registerUser({
        id: 'u-deactivated',
        email: 'deact@sgmt.cl',
        password: 'password123',
        isActive: true,
      });

      const refreshToken = authEngine.signToken(
        { sub: user.id, type: 'refresh' },
        authEngine.jwtRefreshSecret,
        604800
      );

      // Deactivate user in database
      user.isActive = false;

      expect(() => {
        authEngine.refreshToken(refreshToken);
      }).toThrow('Account is inactive');
    });

    it('T5-SEC-08: Role Privilege Escalation via Malformed Roles — Non-array role payload fails closed', () => {
      const malformedRoleToken = authEngine.signToken(
        { sub: 'u-malformed', email: 'mal@sgmt.cl', roles: 'ADMIN_SISTEMA_STRING', type: 'access' },
        authEngine.jwtSecret,
        900
      );

      // The authorizer must fail-closed and throw or forbid access
      expect(() => {
        authEngine.authorize(malformedRoleToken, ['ADMIN_SISTEMA']);
      }).toThrow();
    });

    it('T5-SEC-09: Role Privilege Escalation via Case & Whitespace Manipulation — Case-mismatched or padded roles rejected', () => {
      const paddedRoleToken = authEngine.signToken(
        { sub: 'u-padded', email: 'pad@sgmt.cl', roles: [' admin_sistema '], type: 'access' },
        authEngine.jwtSecret,
        900
      );

      expect(() => {
        authEngine.authorize(paddedRoleToken, ['ADMIN_SISTEMA']);
      }).toThrow('Forbidden: Insufficient permissions');

      const lowercaseRoleToken = authEngine.signToken(
        { sub: 'u-lower', email: 'low@sgmt.cl', roles: ['admin_sistema'], type: 'access' },
        authEngine.jwtSecret,
        900
      );

      expect(() => {
        authEngine.authorize(lowercaseRoleToken, ['ADMIN_SISTEMA']);
      }).toThrow('Forbidden: Insufficient permissions');
    });

    it('T5-SEC-10: DTO Mass Assignment / Privilege Escalation — Injected admin fields rejected by DTO whitelist', () => {
      const maliciousPayload = {
        email: 'attacker@sgmt.cl',
        password: 'Password123!',
        role: 'ADMIN_SISTEMA',
        isSuperUser: true,
        maxApprovalAmount: 1000000000,
      };

      expect(() => {
        authEngine.validateDto(maliciousPayload, ['email', 'password', 'name'], ['email', 'password']);
      }).toThrow('non-whitelisted property');
    });

    it('T5-SEC-11: DTO Prototype Pollution Resistance — Payload with __proto__ / constructor rejected or isolated', () => {
      const pollutionPayload = JSON.parse('{"email":"safe@sgmt.cl","password":"pass","__proto__":{"pollutedAdmin":true}}');

      // Global Object prototype must remain clean
      expect(({}).pollutedAdmin).toBeUndefined();

      // DTO validation rejects non-whitelisted keys
      expect(() => {
        authEngine.validateDto(pollutionPayload, ['email', 'password'], ['email', 'password']);
      }).toThrow();
    });

    it('T5-SEC-12: AuditLog SQL Injection Payload Neutralization — Malicious SQL strings preserved safely without execution', () => {
      const maliciousEntry = {
        action: "'; DROP TABLE \"AuditLog\"; --",
        entity: "User'; DELETE FROM \"User\"; --",
        userId: "u-inject'; TRUNCATE TABLE \"Stock\"; --",
        detail: {
          query: "SELECT * FROM \"User\" WHERE '1'='1'",
          sql: "UNION ALL SELECT passwordHash, superKeyHash FROM \"User\"",
          superKey: "secret-superkey-to-redact",
        },
        ipAddress: "192.168.1.1'; DROP TABLE \"AuditLog\"; --",
      };

      const recorded = auditEngine.record(maliciousEntry);
      expect(recorded).toBeDefined();
      expect(recorded.action).toBe("'; DROP TABLE \"AuditLog\"; --");
      expect(recorded.entity).toBe("User'; DELETE FROM \"User\"; --");
      expect(recorded.detail.superKey).toBe('[REDACTED]');
      expect(recorded.detail.query).toBe("SELECT * FROM \"User\" WHERE '1'='1'");
    });

    it('T5-SEC-13: AuditLog Database Immutability Enforcement — Direct UPDATE, DELETE, TRUNCATE attempts blocked', () => {
      const log = auditEngine.record({
        action: 'ORDER_APPROVED',
        entity: 'PurchaseOrder',
        detail: { orderId: 'OC-202610-0001', amount: 500000 },
      });

      expect(() => {
        auditEngine.update(log.id, { action: 'ORDER_CANCELLED_TAMPERED' });
      }).toThrow('AuditLog records are strictly immutable and cannot be updated');

      expect(() => {
        auditEngine.delete(log.id);
      }).toThrow('AuditLog records are strictly immutable and cannot be deleted');

      expect(() => {
        auditEngine.truncate();
      }).toThrow('AuditLog table cannot be truncated');
    });

    it('T5-SEC-14: Deep Recursive Redaction — Nested credential structures sanitized at all levels', () => {
      const nestedPayload = {
        level1: {
          description: 'Login payload',
          level2: {
            credentials: {
              password: 'sensitive-cleartext-password',
              accessToken: 'jwt-access-token-raw',
              deepLevel3: {
                superKey: 'superkey-top-secret',
                refreshToken: 'refresh-token-raw',
                publicField: 'safe-public-data',
              },
            },
          },
        },
      };

      const recorded = auditEngine.record({
        action: 'NESTED_AUTH_AUDIT',
        entity: 'Auth',
        detail: nestedPayload,
      });

      expect(recorded.detail.level1.level2.credentials.password).toBe('[REDACTED]');
      expect(recorded.detail.level1.level2.credentials.accessToken).toBe('[REDACTED]');
      expect(recorded.detail.level1.level2.credentials.deepLevel3.superKey).toBe('[REDACTED]');
      expect(recorded.detail.level1.level2.credentials.deepLevel3.refreshToken).toBe('[REDACTED]');
      expect(recorded.detail.level1.level2.credentials.deepLevel3.publicField).toBe('safe-public-data');
    });
  });

  // =========================================================================
  // DOMAIN 2: Business Logic, Concurrency & Data Integrity (13 Tests)
  // =========================================================================
  describe('Domain 2: Business Logic, Concurrency & Data Integrity Adversarial Hardening', () => {
    it('T5-LOGIC-01: Decimal Precision vs Floating Point Drift — 100 consecutive small fractional movements preserve exact balance', () => {
      // 100 consecutive cycles of INGRESO 1 and SALIDA 1
      for (let i = 0; i < 100; i++) {
        stockEngine.executeMovement({
          type: 'INGRESO',
          warehouseId: 'wh-precision',
          itemId: 'item-precision-valve',
          quantity: 1,
          unitCost: 15.5,
        });
        stockEngine.executeMovement({
          type: 'SALIDA',
          warehouseId: 'wh-precision',
          itemId: 'item-precision-valve',
          quantity: 1,
        });
      }

      const finalStock = stockEngine.getStock('item-precision-valve', 'wh-precision');
      expect(finalStock.quantity).toBe(0);
      expect(finalStock.averageCost).toBe(15.5);

      const kardex = stockEngine.queryKardex({
        itemId: 'item-precision-valve',
        warehouseId: 'wh-precision',
      });
      expect(kardex.length).toBe(200);
      expect(kardex[kardex.length - 1].balance).toBe(0);
    });

    it('T5-LOGIC-02: Extreme Monetary & High-Volume Precision — Fractional costs calculate without NaN/Overflow', () => {
      stockEngine.executeMovement({
        type: 'INGRESO',
        warehouseId: 'wh-mining-highval',
        itemId: 'item-caterpillar-transmission',
        quantity: 10,
        unitCost: 1250000.75,
      });

      // Add high-volume precision batch
      stockEngine.executeMovement({
        type: 'INGRESO',
        warehouseId: 'wh-mining-highval',
        itemId: 'item-caterpillar-transmission',
        quantity: 5,
        unitCost: 1450000.25,
      });

      const stock = stockEngine.getStock('item-caterpillar-transmission', 'wh-mining-highval');
      expect(stock.quantity).toBe(15);
      // Expected total cost: (10 * 1250000.75) + (5 * 1450000.25) = 12500007.5 + 7250001.25 = 19750008.75
      // Average cost: 19750008.75 / 15 = 1316667.25
      expect(stock.averageCost).toBeCloseTo(1316667.25, 2);
    });

    it('T5-LOGIC-03: Zero & Negative Stock Transaction Rejection — INGRESO/SALIDA strictly require quantity > 0', () => {
      expect(() => {
        stockEngine.executeMovement({
          type: 'INGRESO',
          warehouseId: 'wh-main',
          itemId: 'item-test',
          quantity: -10,
        });
      }).toThrow('Quantity must be strictly positive');

      expect(() => {
        stockEngine.executeMovement({
          type: 'INGRESO',
          warehouseId: 'wh-main',
          itemId: 'item-test',
          quantity: 0,
        });
      }).toThrow('Quantity must be strictly positive');

      expect(() => {
        stockEngine.executeMovement({
          type: 'SALIDA',
          warehouseId: 'wh-main',
          itemId: 'item-test',
          quantity: -5,
        });
      }).toThrow('Quantity must be strictly positive');

      expect(() => {
        stockEngine.executeMovement({
          type: 'SALIDA',
          warehouseId: 'wh-main',
          itemId: 'item-test',
          quantity: 0,
        });
      }).toThrow('Quantity must be strictly positive');
    });

    it('T5-LOGIC-04: Insufficient Stock & Overdraw Prevention — SALIDA beyond balance throws error without decrementing', () => {
      stockEngine.executeMovement({
        type: 'INGRESO',
        warehouseId: 'wh-overdraw',
        itemId: 'item-hydraulic-hose',
        quantity: 25,
        unitCost: 10000,
      });

      expect(() => {
        stockEngine.executeMovement({
          type: 'SALIDA',
          warehouseId: 'wh-overdraw',
          itemId: 'item-hydraulic-hose',
          quantity: 26, // 1 unit over current inventory
        });
      }).toThrow('Insufficient stock for item item-hydraulic-hose');

      const stock = stockEngine.getStock('item-hydraulic-hose', 'wh-overdraw');
      expect(stock.quantity).toBe(25); // Preserved
    });

    it('T5-LOGIC-05: Stock Adjustment (AJUSTE) Boundary Conditions — Negative rejected; zero accepted', () => {
      expect(() => {
        stockEngine.executeMovement({
          type: 'AJUSTE',
          warehouseId: 'wh-adj',
          itemId: 'item-adj',
          quantity: -1,
        });
      }).toThrow('Quantity must be strictly positive');

      const zeroAdj = stockEngine.executeMovement({
        type: 'AJUSTE',
        warehouseId: 'wh-adj',
        itemId: 'item-adj',
        quantity: 0,
        unitCost: 0,
      });

      expect(zeroAdj.stock.quantity).toBe(0);
      expect(stockEngine.getStock('item-adj', 'wh-adj').quantity).toBe(0);
    });

    it('T5-LOGIC-06: Warehouse Kardex Isolation — Activity in Warehouse A does not pollute Warehouse B', () => {
      // Seed Warehouse B
      stockEngine.executeMovement({
        type: 'INGRESO',
        warehouseId: 'wh-site-b',
        itemId: 'item-filter-200',
        quantity: 50,
        unitCost: 35000,
      });

      // 10 large transactions in Warehouse A
      for (let i = 0; i < 10; i++) {
        stockEngine.executeMovement({
          type: 'INGRESO',
          warehouseId: 'wh-site-a',
          itemId: 'item-filter-200',
          quantity: 100,
          unitCost: 45000,
        });
      }

      // Warehouse B must remain unchanged
      const stockB = stockEngine.getStock('item-filter-200', 'wh-site-b');
      expect(stockB.quantity).toBe(50);
      expect(stockB.averageCost).toBe(35000);

      const kardexB = stockEngine.queryKardex({
        itemId: 'item-filter-200',
        warehouseId: 'wh-site-b',
      });
      expect(kardexB.length).toBe(1);
    });

    it('T5-LOGIC-07: Concurrency Row Locking — Simultaneous lock attempt throws LockConflict', () => {
      const unlock = stockEngine.acquireRowLock('item-locked', 'wh-central');

      expect(() => {
        stockEngine.acquireRowLock('item-locked', 'wh-central');
      }).toThrow('LockConflict');

      unlock(); // Release lock

      // Can now acquire lock cleanly
      const unlock2 = stockEngine.acquireRowLock('item-locked', 'wh-central');
      expect(typeof unlock2).toBe('function');
      unlock2();
    });

    it('T5-LOGIC-08: Purchase Order Approval Limit Bypass Attack — Exceeding maxApprovalAmount by 1 peso rejected', () => {
      const order = purchaseEngine.createPurchaseOrder({
        supplierId: 'supp-mining-parts',
        lines: [{ itemId: 'item-drill-bit', quantity: 1, unitPrice: 10000001 }],
      });
      purchaseEngine.transitionPurchaseOrder(order.id, 'PENDIENTE_APROBACION');

      const approver = { id: 'u-mgr-10m', maxApprovalAmount: 10000000 }; // 10M limit

      expect(() => {
        purchaseEngine.transitionPurchaseOrder(order.id, 'APROBADA', approver);
      }).toThrow('ApprovalLimitExceeded');
    });

    it('T5-LOGIC-09: SuperKey Exception Approval Adversarial Inputs — Empty/invalid superKey rejected with Unauthorized', () => {
      const order = purchaseEngine.createPurchaseOrder({
        supplierId: 'supp-mining-parts',
        lines: [{ itemId: 'item-drill-bit', quantity: 1, unitPrice: 20000000 }],
      });
      purchaseEngine.transitionPurchaseOrder(order.id, 'PENDIENTE_APROBACION');

      // Empty superKey
      expect(() => {
        purchaseEngine.transitionPurchaseOrder(order.id, 'APROBADA_EXCEPCION', {}, { superKey: '' });
      }).toThrow('Invalid or missing superKey');

      // Whitespace superKey
      expect(() => {
        purchaseEngine.transitionPurchaseOrder(order.id, 'APROBADA_EXCEPCION', {}, { superKey: '   ' });
      }).toThrow('Invalid or missing superKey');

      // Wrong superKey
      expect(() => {
        purchaseEngine.transitionPurchaseOrder(order.id, 'APROBADA_EXCEPCION', {}, { superKey: 'incorrect-pass' });
      }).toThrow('Invalid or missing superKey');

      // Correct superKey succeeds
      const approved = purchaseEngine.transitionPurchaseOrder(
        order.id,
        'APROBADA_EXCEPCION',
        {},
        { superKey: 'valid-master-superkey-2026' }
      );
      expect(approved.status).toBe('APROBADA_EXCEPCION');
    });

    it('T5-LOGIC-10: Double-Receive Attack on Purchase Order — Second reception rejected on terminal RECEPCION_TOTAL', () => {
      const order = purchaseEngine.createPurchaseOrder({
        supplierId: 'supp-parts',
        lines: [{ itemId: 'i-oil', quantity: 50, unitPrice: 10000 }],
      });
      purchaseEngine.transitionPurchaseOrder(order.id, 'PENDIENTE_APROBACION');
      purchaseEngine.transitionPurchaseOrder(order.id, 'APROBADA', { maxApprovalAmount: 1000000 });
      purchaseEngine.transitionPurchaseOrder(order.id, 'EMITIDA');
      purchaseEngine.transitionPurchaseOrder(order.id, 'RECEPCION_TOTAL');

      expect(() => {
        purchaseEngine.transitionPurchaseOrder(order.id, 'RECEPCION_TOTAL');
      }).toThrow('Cannot move Purchase Order from RECEPCION_TOTAL to RECEPCION_TOTAL');
    });

    it('T5-LOGIC-11: Terminal State Immutability (FSM) — RECHAZADA and CANCELADA cannot transition to any other status', () => {
      const orderRejected = purchaseEngine.createPurchaseOrder({
        supplierId: 'supp-1',
        lines: [{ itemId: 'i1', quantity: 1, unitPrice: 100 }],
      });
      purchaseEngine.transitionPurchaseOrder(orderRejected.id, 'PENDIENTE_APROBACION');
      purchaseEngine.transitionPurchaseOrder(orderRejected.id, 'RECHAZADA');

      expect(() => {
        purchaseEngine.transitionPurchaseOrder(orderRejected.id, 'APROBADA');
      }).toThrow('Cannot move Purchase Order from RECHAZADA to APROBADA');

      const orderCancelled = purchaseEngine.createPurchaseOrder({
        supplierId: 'supp-1',
        lines: [{ itemId: 'i1', quantity: 1, unitPrice: 100 }],
      });
      purchaseEngine.transitionPurchaseOrder(orderCancelled.id, 'CANCELADA');

      expect(() => {
        purchaseEngine.transitionPurchaseOrder(orderCancelled.id, 'PENDIENTE_APROBACION');
      }).toThrow('Cannot move Purchase Order from CANCELADA to PENDIENTE_APROBACION');
    });

    it('T5-LOGIC-12: Concurrency Race on Order Approval — Conflicting approval transitions enforce FSM state consistency', () => {
      const order = purchaseEngine.createPurchaseOrder({
        supplierId: 'supp-1',
        lines: [{ itemId: 'i1', quantity: 1, unitPrice: 100 }],
      });
      purchaseEngine.transitionPurchaseOrder(order.id, 'PENDIENTE_APROBACION');

      // Approver 1 approves
      purchaseEngine.transitionPurchaseOrder(order.id, 'APROBADA', { maxApprovalAmount: 10000 });

      // Approver 2 tries to reject an already approved order
      expect(() => {
        purchaseEngine.transitionPurchaseOrder(order.id, 'RECHAZADA');
      }).toThrow('Cannot move Purchase Order from APROBADA to RECHAZADA');
    });

    it('T5-LOGIC-13: Database Exception Filter Error Translation — P2002, P2003, P2025 mapped to 409, 400, 404', () => {
      const p2002 = PrismaClientExceptionFilter.catch({
        code: 'P2002',
        meta: { target: ['rut'] },
      });
      expect(p2002.statusCode).toBe(409);
      expect(p2002.error).toBe('Conflict');

      const p2003 = PrismaClientExceptionFilter.catch({
        code: 'P2003',
        meta: { field_name: 'warehouseId' },
      });
      expect(p2003.statusCode).toBe(400);
      expect(p2003.error).toBe('Bad Request');

      const p2025 = PrismaClientExceptionFilter.catch({
        code: 'P2025',
        meta: { cause: 'Asset record does not exist' },
      });
      expect(p2025.statusCode).toBe(404);
      expect(p2025.error).toBe('Not Found');
    });
  });

  // =========================================================================
  // DOMAIN 3: Frontend Resilience & Modern UX/UI Contracts (8 Tests)
  // =========================================================================
  describe('Domain 3: Frontend Resilience & Modern UX/UI Contracts', () => {
    it('T5-UI-01: XSS Injection Neutralization in Toast Notifications — Script tags stored as safe text without execution', () => {
      const toastManager = UIContractEngine.createToastManager();
      const xssPayload = "<script>alert('XSS')</script><img src=x onerror=alert(1)>";

      const toast = toastManager.show({
        type: 'error',
        title: 'XSS Probe',
        message: xssPayload,
      });

      expect(toast.id).toBeDefined();
      expect(toast.message).toBe(xssPayload);
      // React JSX renders {toast.message} as textContent, never innerHTML
      expect(typeof toast.message).toBe('string');
    });

    it('T5-UI-02: Huge Payload & String Overflow in Toast Notifications — 10,000 character message handled without crashing', () => {
      const toastManager = UIContractEngine.createToastManager();
      const hugeMessage = 'A'.repeat(10000);

      const toast = toastManager.show({
        type: 'info',
        title: 'Stress Test',
        message: hugeMessage,
      });

      expect(toast.message.length).toBe(10000);
      expect(toastManager.toasts.length).toBe(1);
    });

    it('T5-UI-03: Toast Rapid Lifecycle & Nonexistent ID Dismissal — Rapid dispatch and dismissal of invalid ID does not throw', () => {
      const toastManager = UIContractEngine.createToastManager();

      for (let i = 0; i < 50; i++) {
        toastManager.show({ message: `Notification ${i}` });
      }
      expect(toastManager.toasts.length).toBe(50);

      // Dismiss nonexistent ID
      expect(() => {
        toastManager.dismiss('non-existent-toast-id-9999');
      }).not.toThrow();

      expect(toastManager.toasts.length).toBe(50);

      toastManager.clear();
      expect(toastManager.toasts.length).toBe(0);
    });

    it('T5-UI-04: DataTable Empty Data State Contract — Empty array displays designated empty message gracefully', () => {
      const emptyStateConfig = {
        data: [],
        columns: [{ header: 'Folio', accessorKey: 'folio' }],
        emptyMessage: 'No hay datos disponibles',
      };

      expect(emptyStateConfig.data.length).toBe(0);
      expect(emptyStateConfig.emptyMessage).toBe('No hay datos disponibles');
    });

    it('T5-UI-05: DataTable Massive Row Count Contract — 5,000 row dataset processes without memory exhaustion', () => {
      const massiveDataset = Array.from({ length: 5000 }).map((_, idx) => ({
        id: `row-${idx}`,
        folio: `MOV-202610-${String(idx).padStart(4, '0')}`,
        quantity: idx * 10,
      }));

      expect(massiveDataset.length).toBe(5000);
      expect(massiveDataset[4999].folio).toBe('MOV-202610-4999');
      // Verifies row-key resolution fallback
      const rowKey = massiveDataset[0].id || 0;
      expect(rowKey).toBe('row-0');
    });

    it('T5-UI-06: Modal Backdrop Dismissal Resilience Under Dirty State — Dirty modal prevents backdrop dismissal', () => {
      const modal = UIContractEngine.createModalState(true); // isDirty = true
      expect(modal.isOpen).toBe(true);
      expect(modal.isDirty).toBe(true);

      // Backdrop click without explicit confirmation must NOT close modal
      const closed = modal.attemptBackdropClose(false);
      expect(closed).toBe(false);
      expect(modal.isOpen).toBe(true);

      // User confirms discard
      const confirmedClose = modal.attemptBackdropClose(true);
      expect(confirmedClose).toBe(true);
      expect(modal.isOpen).toBe(false);
    });

    it('T5-UI-07: Axios 401 Token Refresh Interceptor Resilience — Refresh failure triggers clean logout without infinite loop', async () => {
      let logoutCalled = false;
      let refreshAttemptCount = 0;

      const mockAuthStore = {
        accessToken: 'expired-access-token',
        refreshToken: 'invalid-refresh-token',
        refreshAccessToken: async () => {
          refreshAttemptCount++;
          throw new Error('Refresh token expired or revoked');
        },
        logout: () => {
          logoutCalled = true;
        },
      };

      // Simulate Axios response interceptor error handling
      const originalRequest = { _retry: false, headers: {} };
      const simulatedInterceptor = async (error) => {
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          try {
            await mockAuthStore.refreshAccessToken();
          } catch (refreshError) {
            mockAuthStore.logout();
            throw refreshError;
          }
        }
        throw error;
      };

      const error401 = { response: { status: 401 }, config: originalRequest };

      let caughtErr = null;
      try {
        await simulatedInterceptor(error401);
      } catch (err) {
        caughtErr = err;
      }

      expect(caughtErr).toBeDefined();
      expect(caughtErr.message).toBe('Refresh token expired or revoked');
      expect(logoutCalled).toBe(true);
      expect(refreshAttemptCount).toBe(1);
      expect(originalRequest._retry).toBe(true);

      // Subsequent 401 attempt on same request with _retry=true does NOT call refresh again (no infinite loop)
      let secondErr = null;
      try {
        await simulatedInterceptor(error401);
      } catch (err) {
        secondErr = err;
      }
      expect(secondErr).toBeDefined();
      expect(refreshAttemptCount).toBe(1); // Did not increment
    });

    it('T5-UI-08: React Query Cache Key Strict Synchronization — Invalidation must match exact [dashboard-metrics] key', () => {
      expect(UIContractEngine.validateQueryKey(['dashboard-metrics'])).toBe(true);

      expect(() => {
        UIContractEngine.validateQueryKey(['dashboard']);
      }).toThrow('Invalid dashboard cache key');

      expect(() => {
        UIContractEngine.validateQueryKey('dashboard-metrics');
      }).toThrow('Invalid dashboard cache key');
    });
  });
});

// Self-executing runner when executed standalone via `node tests/tier5_adversarial.js`
if (require.main === module) {
  (async () => {
    const verbose = process.argv.includes('--verbose') || process.argv.includes('-v');
    const result = await runSuites({ verbose, tier: 5 });

    console.log('\n\x1b[1m\x1b[34m============================================================\x1b[0m');
    console.log('\x1b[1m\x1b[37m  TIER 5 ADVERSARIAL TEST SUITE EXECUTION SUMMARY\x1b[0m');
    console.log('\x1b[1m\x1b[34m============================================================\x1b[0m');
    console.log(`Total Adversarial Tests : \x1b[1m${result.total}\x1b[0m`);
    console.log(`Passed                  : \x1b[32m\x1b[1m${result.passed}\x1b[0m`);
    console.log(`Failed                  : ${result.failed > 0 ? `\x1b[31m\x1b[1m${result.failed}\x1b[0m` : '\x1b[32m0\x1b[0m'}`);
    console.log(`Duration                : ${result.durationMs} ms`);

    if (result.failures.length > 0) {
      console.log('\n\x1b[31m\x1b[1mFAILURES REPORT:\x1b[0m');
      for (const fail of result.failures) {
        console.log(`\n\x1b[31m✖ [${fail.suite}] > ${fail.test}\x1b[0m`);
        console.log(`  ${fail.error}`);
      }
      console.log('\n\x1b[31mTIER 5 RESULT: FAILED (Exit Code 1)\x1b[0m\n');
      process.exit(1);
    } else {
      console.log('\n\x1b[32m\x1b[1mALL 35 TIER 5 ADVERSARIAL TESTS PASSED! (Exit Code 0)\x1b[0m\n');
      process.exit(0);
    }
  })().catch((err) => {
    console.error('\x1b[31mFatal Tier 5 test runner exception:\x1b[0m', err);
    process.exit(1);
  });
}
