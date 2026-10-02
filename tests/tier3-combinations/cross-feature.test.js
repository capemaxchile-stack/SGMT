/**
 * Tier 3: Cross-Feature Combinations — Pairwise Interactions & State Flow Between Modules
 * Multi-module end-to-end integration flows (>= 5 test cases per combination flow)
 */

const { describe, it, expect, beforeEach } = require('../harness');
const { AuthEngine } = require('../harness/auth-engine');
const { AuditEngine } = require('../harness/audit-engine');
const { StockEngine } = require('../harness/stock-engine');
const { PurchaseEngine } = require('../harness/purchase-engine');
const { PrismaClientExceptionFilter, EntityManager } = require('../harness/exception-filter');
const { UIContractEngine } = require('../harness/ui-contract-engine');

describe('Tier 3: Cross-Feature Multi-Module Integration Flows', () => {
  let authEngine;
  let auditEngine;
  let stockEngine;
  let purchaseEngine;
  let entityManager;

  beforeEach(() => {
    authEngine = new AuthEngine({
      jwtSecret: 't3-jwt-access-secret-32-chars-long-valid!',
      jwtRefreshSecret: 't3-jwt-refresh-secret-32-chars-distinct!',
    });
    auditEngine = new AuditEngine();
    stockEngine = new StockEngine();
    purchaseEngine = new PurchaseEngine();
    entityManager = new EntityManager();
  });

  // -------------------------------------------------------------
  // Flow 1: TF-AUTH-AUDIT-RBAC
  // Auth Login -> Audit Logging -> RolesGuard Verification -> Sanitized Users List
  // -------------------------------------------------------------
  describe('Flow 1: TF-AUTH-AUDIT-RBAC — Authentication, Auditing and RBAC Protection', () => {
    let adminToken;

    beforeEach(() => {
      authEngine.registerUser({
        id: 'u-admin-cross',
        email: 'admin.flow@sgmt.cl',
        name: 'Admin Flow',
        password: 'PassFlow123!',
        superKey: 'MasterKeyCrossModule',
        isActive: true,
        roles: ['ADMIN'],
      });
    });

    it('TF-AUTH-AUDIT-RBAC-01: Step 1: User authenticates and receives valid JWT tokens', () => {
      const loginRes = authEngine.login('admin.flow@sgmt.cl', 'PassFlow123!');
      expect(loginRes.accessToken).toBeDefined();
      expect(loginRes.refreshToken).toBeDefined();
      adminToken = loginRes.accessToken;
    });

    it('TF-AUTH-AUDIT-RBAC-02: Step 2: System logs LOGIN audit event with credentials redacted', () => {
      const log = auditEngine.record({
        action: 'LOGIN',
        entity: 'User',
        userId: 'u-admin-cross',
        ipAddress: '10.0.0.1',
        detail: { email: 'admin.flow@sgmt.cl', password: 'PassFlow123!' },
      });
      expect(log.action).toBe('LOGIN');
      expect(log.detail.password).toBe('[REDACTED]');
      expect(log.detail.email).toBe('admin.flow@sgmt.cl');
    });

    it('TF-AUTH-AUDIT-RBAC-03: Step 3: RolesGuard validates token and enforces ADMIN role', () => {
      const loginRes = authEngine.login('admin.flow@sgmt.cl', 'PassFlow123!');
      const payload = authEngine.authorize(loginRes.accessToken, ['ADMIN']);
      expect(payload.sub).toBe('u-admin-cross');
      expect(payload.roles).toContain('ADMIN');
    });

    it('TF-AUTH-AUDIT-RBAC-04: Step 4: Querying /api/users returns sanitized UserSummaryDto list', () => {
      const users = authEngine.findAllActive();
      const adminUser = users.find(u => u.id === 'u-admin-cross');
      expect(adminUser).toBeDefined();
      expect(adminUser.passwordHash).toBeUndefined();
      expect(adminUser.superKeyHash).toBeUndefined();
    });

    it('TF-AUTH-AUDIT-RBAC-05: Step 5: Deactivated user fails at login and generates no access token', () => {
      const user = authEngine.users.get('u-admin-cross');
      user.isActive = false;
      expect(() => {
        authEngine.login('admin.flow@sgmt.cl', 'PassFlow123!');
      }).toThrow('Account is inactive');
    });
  });

  // -------------------------------------------------------------
  // Flow 2: TF-PO-APPROVAL-AUDIT
  // Purchase Request -> Approval -> SuperKey Override -> Audit Immutability
  // -------------------------------------------------------------
  describe('Flow 2: TF-PO-APPROVAL-AUDIT — High-Value Purchase Approval & Redacted Audit', () => {
    let request;
    let order;

    it('TF-PO-APPROVAL-AUDIT-01: Step 1: Field Request created and approved at site level', () => {
      request = purchaseEngine.createFieldRequest({
        faenaId: 'faena-los-bronces',
        requesterId: 'u-chief-1',
        justification: 'Repuesto motor camión tolva CAT 797F',
      });
      purchaseEngine.transitionFieldRequest(request.id, 'PENDIENTE');
      const approved = purchaseEngine.transitionFieldRequest(request.id, 'APROBADA');
      expect(approved.status).toBe('APROBADA');
    });

    it('TF-PO-APPROVAL-AUDIT-02: Step 2: Request converted into high-value Purchase Order ($15,000,000)', () => {
      request = purchaseEngine.createFieldRequest({
        faenaId: 'faena-los-bronces',
        requesterId: 'u-chief-1',
        justification: 'Repuesto motor',
      });
      purchaseEngine.transitionFieldRequest(request.id, 'PENDIENTE');
      purchaseEngine.transitionFieldRequest(request.id, 'APROBADA');

      const converted = purchaseEngine.convertFieldRequestToPO(request.id, 'supp-komatsu', [
        { itemId: 'motor-cat-797', quantity: 1, unitPrice: 15000000 },
      ]);
      order = converted.purchaseOrder;
      expect(order.totalAmount).toBe(15000000);
      expect(order.status).toBe('BORRADOR');
    });

    it('TF-PO-APPROVAL-AUDIT-03: Step 3: Regular approver with $5,000,000 limit is blocked', () => {
      request = purchaseEngine.createFieldRequest({ faenaId: 'f1', requesterId: 'u1', justification: 'rep' });
      purchaseEngine.transitionFieldRequest(request.id, 'PENDIENTE');
      purchaseEngine.transitionFieldRequest(request.id, 'APROBADA');
      const conv = purchaseEngine.convertFieldRequestToPO(request.id, 'supp-1', [{ itemId: 'i1', quantity: 1, unitPrice: 15000000 }]);
      order = conv.purchaseOrder;

      purchaseEngine.transitionPurchaseOrder(order.id, 'PENDIENTE_APROBACION');

      expect(() => {
        purchaseEngine.transitionPurchaseOrder(order.id, 'APROBADA', { maxApprovalAmount: 5000000 });
      }).toThrow('ApprovalLimitExceeded');
    });

    it('TF-PO-APPROVAL-AUDIT-04: Step 4: Operations Manager authorizes exception using superKey', () => {
      request = purchaseEngine.createFieldRequest({ faenaId: 'f1', requesterId: 'u1', justification: 'rep' });
      purchaseEngine.transitionFieldRequest(request.id, 'PENDIENTE');
      purchaseEngine.transitionFieldRequest(request.id, 'APROBADA');
      const conv = purchaseEngine.convertFieldRequestToPO(request.id, 'supp-1', [{ itemId: 'i1', quantity: 1, unitPrice: 15000000 }]);
      order = conv.purchaseOrder;
      purchaseEngine.transitionPurchaseOrder(order.id, 'PENDIENTE_APROBACION');

      const approved = purchaseEngine.transitionPurchaseOrder(
        order.id,
        'APROBADA_EXCEPCION',
        { maxApprovalAmount: 5000000 },
        { superKey: 'valid-master-superkey-2026' }
      );
      expect(approved.status).toBe('APROBADA_EXCEPCION');
    });

    it('TF-PO-APPROVAL-AUDIT-05: Step 5: AuditLog records exception approval and redacts superKey', () => {
      const log = auditEngine.record({
        action: 'ORDER_APPROVE_EXCEPTION',
        entity: 'PurchaseOrder',
        entityId: 'OC-TEST-001',
        userId: 'u-manager',
        detail: {
          superKey: 'valid-master-superkey-2026',
          amount: 15000000,
          reason: 'Falla crítica faena Los Bronces',
        },
      });
      expect(log.detail.superKey).toBe('[REDACTED]');
      expect(log.detail.amount).toBe(15000000);
      expect(log.detail.reason).toBe('Falla crítica faena Los Bronces');
    });
  });

  // -------------------------------------------------------------
  // Flow 3: TF-PO-RECEPTION-STOCK
  // Order Emission -> Warehouse Reception -> Row Lock -> PMP Calculation -> Kardex
  // -------------------------------------------------------------
  describe('Flow 3: TF-PO-RECEPTION-STOCK — Purchase Order Reception and Inventory Accounting', () => {
    let order;

    beforeEach(() => {
      order = purchaseEngine.createPurchaseOrder({
        supplierId: 'supp-finning',
        lines: [{ itemId: 'item-filtro-aire', quantity: 100, unitPrice: 25000 }], // 2,500,000
      });
      purchaseEngine.transitionPurchaseOrder(order.id, 'PENDIENTE_APROBACION');
      purchaseEngine.transitionPurchaseOrder(order.id, 'APROBADA', { maxApprovalAmount: 5000000 });
      purchaseEngine.transitionPurchaseOrder(order.id, 'EMITIDA');
      purchaseEngine.transitionPurchaseOrder(order.id, 'RECEPCION_TOTAL');

      stockEngine.executeMovement({
        type: 'INGRESO',
        warehouseId: 'wh-central',
        itemId: 'item-filtro-aire',
        quantity: 100,
        unitCost: 25000,
        purchaseOrderId: order.id,
      });
    });

    it('TF-PO-RECEPTION-STOCK-01: Step 1: Purchase Order status moves to RECEPCION_TOTAL', () => {
      expect(order.status).toBe('RECEPCION_TOTAL');
    });

    it('TF-PO-RECEPTION-STOCK-02: Step 2: Warehouse creates INGRESO movement tied to purchaseOrderId', () => {
      const kardex = stockEngine.queryKardex({ itemId: 'item-filtro-aire', warehouseId: 'wh-central' });
      expect(kardex.length).toBe(1);
      expect(kardex[0].movementNumber).toMatch(/^MOV-\d{6}-\d{4}$/);
      expect(kardex[0].purchaseOrderId).toBe(order.id);
    });

    it('TF-PO-RECEPTION-STOCK-03: Step 3: Row locking ensures stock balance reflects all 100 units', () => {
      const stock = stockEngine.getStock('item-filtro-aire', 'wh-central');
      expect(stock.quantity).toBe(100);
      expect(stock.averageCost).toBe(25000);
    });

    it('TF-PO-RECEPTION-STOCK-04: Step 4: Second batch at $35,000 recalculates PMP precisely', () => {
      // 100 @ 25,000 = 2,500,000 + 100 @ 35,000 = 3,500,000. Total = 6,000,000 / 200 = 30,000
      stockEngine.executeMovement({
        type: 'INGRESO',
        warehouseId: 'wh-central',
        itemId: 'item-filtro-aire',
        quantity: 100,
        unitCost: 35000,
      });
      const stock = stockEngine.getStock('item-filtro-aire', 'wh-central');
      expect(stock.quantity).toBe(200);
      expect(stock.averageCost).toBe(30000);
    });

    it('TF-PO-RECEPTION-STOCK-05: Step 5: Central Warehouse Kardex records both chronological receptions', () => {
      stockEngine.executeMovement({
        type: 'INGRESO',
        warehouseId: 'wh-central',
        itemId: 'item-filtro-aire',
        quantity: 100,
        unitCost: 35000,
      });
      const kardex = stockEngine.queryKardex({ itemId: 'item-filtro-aire', warehouseId: 'wh-central' });
      expect(kardex.length).toBe(2);
      expect(kardex[0].balance).toBe(100);
      expect(kardex[1].balance).toBe(200);
      expect(kardex[1].averageCost).toBe(30000);
    });
  });

  // -------------------------------------------------------------
  // Flow 4: TF-MOVEMENT-KARDEX-CACHE
  // SALIDA Movement -> Active PMP Stamp -> Kardex Ledger -> Cache Invalidation
  // -------------------------------------------------------------
  describe('Flow 4: TF-MOVEMENT-KARDEX-CACHE — Stock Draw, Cost Stamping & Dashboard Invalidation', () => {
    beforeEach(() => {
      stockEngine.executeMovement({
        type: 'INGRESO',
        warehouseId: 'wh-mina-sur',
        itemId: 'item-aceite-15w40',
        quantity: 50,
        unitCost: 12000,
      });
    });

    it('TF-MOVEMENT-KARDEX-CACHE-01: Step 1: SALIDA movement draws 10 drums for Excavator EX-02', () => {
      const salida = stockEngine.executeMovement({
        type: 'SALIDA',
        warehouseId: 'wh-mina-sur',
        itemId: 'item-aceite-15w40',
        quantity: 10,
        assetId: 'asset-ex-02',
        faenaId: 'faena-sur',
        unitCost: 0, // Should be overwritten by active PMP
      });
      expect(salida.stock.quantity).toBe(40);
    });

    it('TF-MOVEMENT-KARDEX-CACHE-02: Step 2: Line unitCost automatically stamped to active PMP ($12,000)', () => {
      const salida = stockEngine.executeMovement({
        type: 'SALIDA',
        warehouseId: 'wh-mina-sur',
        itemId: 'item-aceite-15w40',
        quantity: 5,
        unitCost: 999999, // Attempted bogus input
      });
      expect(salida.kardexEntry.stampedUnitCost).toBe(12000);
      expect(salida.kardexEntry.totalCost).toBe(60000);
    });

    it('TF-MOVEMENT-KARDEX-CACHE-03: Step 3: Warehouse stock quantity decrements accurately to 35 after 15 units drawn', () => {
      stockEngine.executeMovement({ type: 'SALIDA', warehouseId: 'wh-mina-sur', itemId: 'item-aceite-15w40', quantity: 10 });
      stockEngine.executeMovement({ type: 'SALIDA', warehouseId: 'wh-mina-sur', itemId: 'item-aceite-15w40', quantity: 5 });

      const stock = stockEngine.getStock('item-aceite-15w40', 'wh-mina-sur');
      expect(stock.quantity).toBe(35);
      expect(stock.averageCost).toBe(12000); // PMP unchanged by SALIDA!
    });

    it('TF-MOVEMENT-KARDEX-CACHE-04: Step 4: Kardex reflects updated balance and movement metadata', () => {
      stockEngine.executeMovement({ type: 'SALIDA', warehouseId: 'wh-mina-sur', itemId: 'item-aceite-15w40', quantity: 10 });
      stockEngine.executeMovement({ type: 'SALIDA', warehouseId: 'wh-mina-sur', itemId: 'item-aceite-15w40', quantity: 5 });

      const kardex = stockEngine.queryKardex({ itemId: 'item-aceite-15w40', warehouseId: 'wh-mina-sur' });
      expect(kardex.length).toBe(3); // 1 ingreso, 2 salidas
      const lastEntry = kardex[kardex.length - 1];
      expect(lastEntry.balance).toBe(35);
      expect(lastEntry.type).toBe('SALIDA');
    });

    it('TF-MOVEMENT-KARDEX-CACHE-05: Step 5: Dashboard metrics cache key [\'dashboard-metrics\'] invalidated', () => {
      let invalidated = false;
      const client = {
        invalidateQueries: ({ queryKey }) => {
          if (queryKey[0] === 'dashboard-metrics') invalidated = true;
        },
      };
      client.invalidateQueries({ queryKey: UIContractEngine.getDashboardCacheKey() });
      expect(invalidated).toBe(true);
    });
  });

  // -------------------------------------------------------------
  // Flow 5: TF-SOFTDELETE-INTEGRITY
  // Entity Soft-Delete -> Integrity Filter -> Safe API Error Handling
  // -------------------------------------------------------------
  describe('Flow 5: TF-SOFTDELETE-INTEGRITY — Soft-Delete and Clean Exception Handling', () => {
    let supplier;

    beforeEach(() => {
      supplier = entityManager.create('Supplier', {
        businessName: 'Proveedor Antiguo S.A.',
        rut: '99.999.999-9',
      });
    });

    it('TF-SOFTDELETE-INTEGRITY-01: Step 1: Soft-deleting supplier sets isActive to false', () => {
      const deleted = entityManager.softDelete('Supplier', supplier.id);
      expect(deleted.isActive).toBe(false);
      expect(deleted.deletedAt).toBeDefined();
    });

    it('TF-SOFTDELETE-INTEGRITY-02: Step 2: Inactive supplier is excluded from active query list', () => {
      entityManager.softDelete('Supplier', supplier.id);
      const activeList = entityManager.findActive('Supplier');
      expect(activeList.find(s => s.id === supplier.id)).toBeUndefined();
    });

    it('TF-SOFTDELETE-INTEGRITY-03: Step 3: Attempting hard delete on entity with dependents is blocked', () => {
      expect(() => {
        entityManager.hardDelete('Supplier', supplier.id, true);
      }).toThrow('Foreign key violation');
    });

    it('TF-SOFTDELETE-INTEGRITY-04: Step 4: Exception filter translates P2003 error to HTTP 400 Bad Request', () => {
      let filterResponse = null;
      try {
        entityManager.hardDelete('Supplier', supplier.id, true);
      } catch (err) {
        filterResponse = PrismaClientExceptionFilter.catch(err);
      }
      expect(filterResponse.statusCode).toBe(400);
      expect(filterResponse.error).toBe('Bad Request');
    });

    it('TF-SOFTDELETE-INTEGRITY-05: Step 5: API returns structured JSON error without crashing server', () => {
      const err = new Error('Record not found');
      err.code = 'P2025';
      const res = PrismaClientExceptionFilter.catch(err);
      expect(res.statusCode).toBe(404);
      expect(res.message).toBeDefined();
    });
  });

  // -------------------------------------------------------------
  // Flow 6: TF-MULTI-WAREHOUSE-ISOLATION
  // Inter-warehouse Transfer -> Independent PMP & Isolated Ledgers
  // -------------------------------------------------------------
  describe('Flow 6: TF-MULTI-WAREHOUSE-ISOLATION — Inter-Warehouse Stock Transfer & Ledger Isolation', () => {
    beforeEach(() => {
      stockEngine.executeMovement({
        type: 'INGRESO',
        warehouseId: 'wh-central',
        itemId: 'item-fuel-filter',
        quantity: 200,
        unitCost: 10000,
      });
    });

    it('TF-MULTI-WAREHOUSE-01: Step 1: Central Warehouse receives 200 fuel filters at $10,000', () => {
      const stock = stockEngine.getStock('item-fuel-filter', 'wh-central');
      expect(stock.quantity).toBe(200);
      expect(stock.averageCost).toBe(10000);
    });

    it('TF-MULTI-WAREHOUSE-02: Step 2: Transfer SALIDA from Central Warehouse stamps active PMP ($10,000)', () => {
      const salida = stockEngine.executeMovement({
        type: 'SALIDA',
        warehouseId: 'wh-central',
        itemId: 'item-fuel-filter',
        quantity: 50,
        notes: 'Transferencia a Faena El Teniente',
      });
      expect(salida.stock.quantity).toBe(150);
      expect(salida.kardexEntry.stampedUnitCost).toBe(10000);
    });

    it('TF-MULTI-WAREHOUSE-03: Step 3: Destination Faena Warehouse receives 50 filters with freight cost ($11,000)', () => {
      stockEngine.executeMovement({
        type: 'INGRESO',
        warehouseId: 'wh-faena-teniente',
        itemId: 'item-fuel-filter',
        quantity: 50,
        unitCost: 11000, // Transferred cost + local freight
        notes: 'Recepción transferencia desde Central',
      });
      const stock = stockEngine.getStock('item-fuel-filter', 'wh-faena-teniente');
      expect(stock.quantity).toBe(50);
      expect(stock.averageCost).toBe(11000);
    });

    it('TF-MULTI-WAREHOUSE-04: Step 4: Central and Faena warehouses maintain independent PMPs', () => {
      stockEngine.executeMovement({
        type: 'SALIDA',
        warehouseId: 'wh-central',
        itemId: 'item-fuel-filter',
        quantity: 50,
      });
      stockEngine.executeMovement({
        type: 'INGRESO',
        warehouseId: 'wh-faena-teniente',
        itemId: 'item-fuel-filter',
        quantity: 50,
        unitCost: 11000,
      });

      const centralStock = stockEngine.getStock('item-fuel-filter', 'wh-central');
      const faenaStock = stockEngine.getStock('item-fuel-filter', 'wh-faena-teniente');
      expect(centralStock.averageCost).toBe(10000);
      expect(faenaStock.averageCost).toBe(11000);
    });

    it('TF-MULTI-WAREHOUSE-05: Step 5: Kardex query for each warehouse returns only its local transactions', () => {
      stockEngine.executeMovement({
        type: 'SALIDA',
        warehouseId: 'wh-central',
        itemId: 'item-fuel-filter',
        quantity: 50,
      });
      stockEngine.executeMovement({
        type: 'INGRESO',
        warehouseId: 'wh-faena-teniente',
        itemId: 'item-fuel-filter',
        quantity: 50,
        unitCost: 11000,
      });

      const centralKardex = stockEngine.queryKardex({ itemId: 'item-fuel-filter', warehouseId: 'wh-central' });
      const faenaKardex = stockEngine.queryKardex({ itemId: 'item-fuel-filter', warehouseId: 'wh-faena-teniente' });
      expect(centralKardex.length).toBe(2); // Ingreso 200, Salida 50
      expect(faenaKardex.length).toBe(1);   // Ingreso 50
    });
  });
});
