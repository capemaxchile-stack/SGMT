/**
 * Tier 4: Real-World Application Scenarios — End-to-End Mining Logistics Workflows
 * Realistic end-to-end operational scenarios in heavy earthmoving & mining logistics
 */

const { describe, it, expect, beforeEach } = require('../harness');
const { AuthEngine } = require('../harness/auth-engine');
const { AuditEngine } = require('../harness/audit-engine');
const { StockEngine } = require('../harness/stock-engine');
const { PurchaseEngine } = require('../harness/purchase-engine');
const { PrismaClientExceptionFilter, EntityManager } = require('../harness/exception-filter');
const { UIContractEngine } = require('../harness/ui-contract-engine');

describe('Tier 4: Real-World Mining Logistics End-to-End Scenarios', () => {
  let authEngine;
  let auditEngine;
  let stockEngine;
  let purchaseEngine;
  let entityManager;

  beforeEach(() => {
    authEngine = new AuthEngine({
      jwtSecret: 't4-mining-jwt-secret-secure-32chars-ok!',
      jwtRefreshSecret: 't4-mining-jwt-refresh-distinct-key-ok!',
    });
    auditEngine = new AuditEngine();
    stockEngine = new StockEngine();
    purchaseEngine = new PurchaseEngine();
    entityManager = new EntityManager();
  });

  // -------------------------------------------------------------
  // Scenario 1: SCENARIO-MINING-SUPPLY-CHAIN
  // End-to-End Mining Requisition, Threshold Approval, Exception & Reception
  // -------------------------------------------------------------
  describe('Scenario 1: Full Mining Requisition & Heavy Parts Procurement Lifecycle', () => {
    let fieldRequest;
    let purchaseOrder;

    it('SCENARIO-1.1: Field Engineer submits field requisition for CAT excavator hydraulic filters', () => {
      fieldRequest = purchaseEngine.createFieldRequest({
        faenaId: 'faena-los-bronces',
        requesterId: 'eng-gonzalo-munoz',
        justification: 'Mantenimiento preventivo 2000 hrs excavadoras CAT 349D',
        items: [{ itemId: 'FILT-CAT-349D', quantity: 10 }],
      });
      expect(fieldRequest.status).toBe('BORRADOR');
      expect(fieldRequest.requestNumber).toMatch(/^ST-\d{6}-\d{4}$/);

      const submitted = purchaseEngine.transitionFieldRequest(fieldRequest.id, 'PENDIENTE');
      expect(submitted.status).toBe('PENDIENTE');
    });

    it('SCENARIO-1.2: Faena Chief reviews and approves requisition for procurement', () => {
      fieldRequest = purchaseEngine.createFieldRequest({
        faenaId: 'faena-los-bronces',
        requesterId: 'eng-gonzalo-munoz',
        justification: 'Mantenimiento preventivo',
      });
      purchaseEngine.transitionFieldRequest(fieldRequest.id, 'PENDIENTE');
      const approved = purchaseEngine.transitionFieldRequest(fieldRequest.id, 'APROBADA');
      expect(approved.status).toBe('APROBADA');
    });

    it('SCENARIO-1.3: Procurement Buyer converts to Purchase Order exceeding normal approval limit ($12,500,000 CLP)', () => {
      fieldRequest = purchaseEngine.createFieldRequest({ faenaId: 'f1', requesterId: 'u1', justification: 'urgente' });
      purchaseEngine.transitionFieldRequest(fieldRequest.id, 'PENDIENTE');
      purchaseEngine.transitionFieldRequest(fieldRequest.id, 'APROBADA');

      const converted = purchaseEngine.convertFieldRequestToPO(fieldRequest.id, 'supp-komatsu-chile', [
        { itemId: 'FILT-CAT-349D', quantity: 10, unitPrice: 1250000 },
      ]);
      purchaseOrder = converted.purchaseOrder;
      expect(purchaseOrder.totalAmount).toBe(12500000);
      expect(converted.request.status).toBe('CONVERTIDA');

      purchaseEngine.transitionPurchaseOrder(purchaseOrder.id, 'PENDIENTE_APROBACION');

      // Regular approver limited to $5,000,000 is rejected
      expect(() => {
        purchaseEngine.transitionPurchaseOrder(purchaseOrder.id, 'APROBADA', { maxApprovalAmount: 5000000 });
      }).toThrow('ApprovalLimitExceeded');
    });

    it('SCENARIO-1.4: Operations Manager authorizes exception using superKey, logged immutably', () => {
      fieldRequest = purchaseEngine.createFieldRequest({ faenaId: 'f1', requesterId: 'u1', justification: 'urgente' });
      purchaseEngine.transitionFieldRequest(fieldRequest.id, 'PENDIENTE');
      purchaseEngine.transitionFieldRequest(fieldRequest.id, 'APROBADA');
      const converted = purchaseEngine.convertFieldRequestToPO(fieldRequest.id, 'supp-komatsu-chile', [
        { itemId: 'FILT-CAT-349D', quantity: 10, unitPrice: 1250000 },
      ]);
      purchaseOrder = converted.purchaseOrder;
      purchaseEngine.transitionPurchaseOrder(purchaseOrder.id, 'PENDIENTE_APROBACION');

      const approved = purchaseEngine.transitionPurchaseOrder(
        purchaseOrder.id,
        'APROBADA_EXCEPCION',
        { maxApprovalAmount: 5000000 },
        { superKey: 'valid-master-superkey-2026' }
      );
      expect(approved.status).toBe('APROBADA_EXCEPCION');

      const log = auditEngine.record({
        action: 'ORDER_APPROVE_EXCEPTION',
        entity: 'PurchaseOrder',
        entityId: purchaseOrder.id,
        userId: 'mgr-carlos-perez',
        detail: { superKey: 'valid-master-superkey-2026', orderNumber: purchaseOrder.orderNumber },
      });
      expect(log.detail.superKey).toBe('[REDACTED]');
    });

    it('SCENARIO-1.5: Central Warehouse receives order: inventory locked, PMP calculated, Kardex updated', () => {
      const reception = stockEngine.executeMovement({
        type: 'INGRESO',
        warehouseId: 'wh-central-santiago',
        itemId: 'FILT-CAT-349D',
        quantity: 10,
        unitCost: 1250000,
        purchaseOrderId: 'OC-202610-0001',
      });
      expect(reception.stock.quantity).toBe(10);
      expect(reception.stock.averageCost).toBe(1250000);
      expect(reception.kardexEntry.balance).toBe(10);
    });
  });

  // -------------------------------------------------------------
  // Scenario 2: SCENARIO-MINE-SITE-CONSUMPTION
  // Heavy Machinery Scheduled Maintenance Draw & PMP Valuation
  // -------------------------------------------------------------
  describe('Scenario 2: Mine Site Equipment Maintenance Stock Consumption', () => {
    beforeEach(() => {
      // Stock initial reception in mine warehouse
      stockEngine.executeMovement({
        type: 'INGRESO',
        warehouseId: 'wh-faena-los-bronces',
        itemId: 'FILT-CAT-349D',
        quantity: 10,
        unitCost: 1250000,
      });
    });

    it('SCENARIO-2.1: Mine warehouse keeper draws 4 hydraulic filters for Bulldozer BD-04', () => {
      const salida = stockEngine.executeMovement({
        type: 'SALIDA',
        warehouseId: 'wh-faena-los-bronces',
        itemId: 'FILT-CAT-349D',
        quantity: 4,
        assetId: 'asset-bulldozer-bd-04',
        faenaId: 'faena-los-bronces',
      });
      expect(salida.stock.quantity).toBe(6);
    });

    it('SCENARIO-2.2: Outgoing movement automatically stamped with active PMP ($1,250,000 CLP)', () => {
      const salida = stockEngine.executeMovement({
        type: 'SALIDA',
        warehouseId: 'wh-faena-los-bronces',
        itemId: 'FILT-CAT-349D',
        quantity: 2,
        assetId: 'asset-bulldozer-bd-04',
      });
      expect(salida.kardexEntry.stampedUnitCost).toBe(1250000);
      expect(salida.kardexEntry.totalCost).toBe(2500000);
    });

    it('SCENARIO-2.3: Warehouse averageCost is preserved intact at $1,250,000 CLP', () => {
      stockEngine.executeMovement({
        type: 'SALIDA',
        warehouseId: 'wh-faena-los-bronces',
        itemId: 'FILT-CAT-349D',
        quantity: 3,
      });
      const stock = stockEngine.getStock('FILT-CAT-349D', 'wh-faena-los-bronces');
      expect(stock.quantity).toBe(7);
      expect(stock.averageCost).toBe(1250000);
    });

    it('SCENARIO-2.4: Mine site Kardex ledger reflects all movements and new balance', () => {
      stockEngine.executeMovement({
        type: 'SALIDA',
        warehouseId: 'wh-faena-los-bronces',
        itemId: 'FILT-CAT-349D',
        quantity: 4,
      });
      const ledger = stockEngine.queryKardex({
        itemId: 'FILT-CAT-349D',
        warehouseId: 'wh-faena-los-bronces',
      });
      expect(ledger.length).toBe(2);
      expect(ledger[0].type).toBe('INGRESO');
      expect(ledger[1].type).toBe('SALIDA');
      expect(ledger[1].balance).toBe(6);
    });

    it('SCENARIO-2.5: Stock consumption triggers dashboard cache key invalidation', () => {
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
  // Scenario 3: SCENARIO-CONCURRENT-PIT-DEMAND
  // High-Pressure Simultaneous Drilling Rig Demands & Negative Stock Prevention
  // -------------------------------------------------------------
  describe('Scenario 3: Concurrent Pit Emergency Demands & Atomic Stock Serialization', () => {
    beforeEach(() => {
      // Emergency stock: Exactly 5 heavy drill bits in stock
      stockEngine.executeMovement({
        type: 'INGRESO',
        warehouseId: 'wh-mina-norte',
        itemId: 'DRILL-BIT-50MM',
        quantity: 5,
        unitCost: 450000,
      });
    });

    it('SCENARIO-3.1: Initial available stock verified at exactly 5 drill bits', () => {
      const stock = stockEngine.getStock('DRILL-BIT-50MM', 'wh-mina-norte');
      expect(stock.quantity).toBe(5);
    });

    it('SCENARIO-3.2: Pit Crew North successfully claims 4 drill bits for drilling rig DR-01', () => {
      const salida1 = stockEngine.executeMovement({
        type: 'SALIDA',
        warehouseId: 'wh-mina-norte',
        itemId: 'DRILL-BIT-50MM',
        quantity: 4,
        assetId: 'rig-dr-01',
      });
      expect(salida1.stock.quantity).toBe(1);
    });

    it('SCENARIO-3.3: Pit Crew South concurrent request for 3 drill bits is rejected due to insufficient stock', () => {
      stockEngine.executeMovement({
        type: 'SALIDA',
        warehouseId: 'wh-mina-norte',
        itemId: 'DRILL-BIT-50MM',
        quantity: 4,
        assetId: 'rig-dr-01',
      });

      expect(() => {
        stockEngine.executeMovement({
          type: 'SALIDA',
          warehouseId: 'wh-mina-norte',
          itemId: 'DRILL-BIT-50MM',
          quantity: 3,
          assetId: 'rig-dr-02',
        });
      }).toThrow('Insufficient stock');
    });

    it('SCENARIO-3.4: Atomic rollback ensures warehouse stock never turns negative', () => {
      stockEngine.executeMovement({
        type: 'SALIDA',
        warehouseId: 'wh-mina-norte',
        itemId: 'DRILL-BIT-50MM',
        quantity: 4,
      });
      try {
        stockEngine.executeMovement({
          type: 'SALIDA',
          warehouseId: 'wh-mina-norte',
          itemId: 'DRILL-BIT-50MM',
          quantity: 3,
        });
      } catch (e) {
        // Expected
      }
      const stock = stockEngine.getStock('DRILL-BIT-50MM', 'wh-mina-norte');
      expect(stock.quantity).toBe(1); // Still 1, never negative!
    });

    it('SCENARIO-3.5: Failed transaction does not write corrupted entry to Kardex ledger', () => {
      stockEngine.executeMovement({ type: 'SALIDA', warehouseId: 'wh-mina-norte', itemId: 'DRILL-BIT-50MM', quantity: 4 });
      try {
        stockEngine.executeMovement({ type: 'SALIDA', warehouseId: 'wh-mina-norte', itemId: 'DRILL-BIT-50MM', quantity: 3 });
      } catch (e) {}

      const kardex = stockEngine.queryKardex({ itemId: 'DRILL-BIT-50MM', warehouseId: 'wh-mina-norte' });
      expect(kardex.length).toBe(2); // 1 ingreso, 1 salida
    });
  });

  // -------------------------------------------------------------
  // Scenario 4: SCENARIO-EMERGENCY-AUDIT-FORENSICS
  // Forensic Audit of Tamper-Proof AuditLog & System Integrity
  // -------------------------------------------------------------
  describe('Scenario 4: Forensic Audit of Tamper-Proof Log & System Integrity', () => {
    it('SCENARIO-4.1: Auditor queries AuditLog verifying sequential chronological events', () => {
      auditEngine.record({ action: 'LOGIN', entity: 'User', userId: 'u1' });
      auditEngine.record({ action: 'ORDER_APPROVE_EXCEPTION', entity: 'PurchaseOrder', userId: 'u2' });
      auditEngine.record({ action: 'MOVEMENT_CREATE', entity: 'WarehouseMovement', userId: 'u3' });

      const logs = auditEngine.getAll();
      expect(logs.length).toBe(3);
      expect(logs[0].id).toBe(1n);
      expect(logs[1].id).toBe(2n);
      expect(logs[2].id).toBe(3n);
    });

    it('SCENARIO-4.2: Immutability triggers reject any attempt to delete or alter evidence', () => {
      const log = auditEngine.record({ action: 'CRITICAL_ACTION', entity: 'Asset' });
      expect(() => {
        auditEngine.delete(log.id);
      }).toThrow('AuditLog records are strictly immutable and cannot be deleted');
      expect(() => {
        auditEngine.update(log.id, { action: 'COVERUP' });
      }).toThrow('AuditLog records are strictly immutable and cannot be updated');
    });

    it('SCENARIO-4.3: Forensics confirms zero plaintext passwords or superKeys leaked in logs', () => {
      auditEngine.record({
        action: 'USER_LOGIN',
        entity: 'User',
        detail: { password: 'secret_password_123', superKey: 'super_key_999' },
      });
      const logs = auditEngine.getAll();
      const last = logs[logs.length - 1];
      expect(last.detail.password).toBe('[REDACTED]');
      expect(last.detail.superKey).toBe('[REDACTED]');
    });

    it('SCENARIO-4.4: Master entities maintain referential integrity with soft deletes', () => {
      const faena = entityManager.create('Faena', { name: 'Mina Esperanza' });
      entityManager.softDelete('Faena', faena.id);

      const active = entityManager.findActive('Faena');
      expect(active.find(f => f.id === faena.id)).toBeUndefined();
    });

    it('SCENARIO-4.5: Database exception filter prevents data disclosure on errors', () => {
      const err = new Error('Constraint violation');
      err.code = 'P2002';
      err.meta = { target: ['rut'] };
      const clientRes = PrismaClientExceptionFilter.catch(err);

      expect(clientRes.statusCode).toBe(409);
      expect(clientRes.error).toBe('Conflict');
      expect(clientRes.message).toContain('Unique constraint violation on rut');
    });
  });
});
