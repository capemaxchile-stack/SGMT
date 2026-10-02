/**
 * Tier 2: Boundary & Corner Cases — Business Logic & Concurrency (LOGIC-01 to LOGIC-10)
 * Rigorous boundary verification (limits, zero, negative, overflow, invalid transitions) (>= 5 tests per feature)
 */

const { describe, it, expect, beforeEach } = require('../harness');
const { StockEngine, DecimalMock } = require('../harness/stock-engine');
const { PurchaseEngine } = require('../harness/purchase-engine');
const { PrismaClientExceptionFilter, EntityManager } = require('../harness/exception-filter');

describe('Tier 2: Business Logic & Concurrency Boundary Cases', () => {
  let stockEngine;
  let purchaseEngine;
  let entityManager;

  beforeEach(() => {
    stockEngine = new StockEngine();
    purchaseEngine = new PurchaseEngine();
    entityManager = new EntityManager();
  });

  // -------------------------------------------------------------
  // Feature 9: LOGIC-STOCK-LOCK (Boundary Cases)
  // -------------------------------------------------------------
  describe('Boundary: LOGIC-STOCK-LOCK — Stock Quantity Limits & Concurrency Collisions', () => {
    it('LOGIC-STOCK-LOCK-B01: Zero quantity movement is strictly rejected', () => {
      expect(() => {
        stockEngine.executeMovement({
          type: 'INGRESO',
          warehouseId: 'wh-1',
          itemId: 'it-1',
          quantity: 0,
        });
      }).toThrow('Quantity must be strictly positive');
    });

    it('LOGIC-STOCK-LOCK-B02: Negative quantity movement is strictly rejected', () => {
      expect(() => {
        stockEngine.executeMovement({
          type: 'INGRESO',
          warehouseId: 'wh-1',
          itemId: 'it-1',
          quantity: -10,
        });
      }).toThrow('Quantity must be strictly positive');
    });

    it('LOGIC-STOCK-LOCK-B03: SALIDA exceeding available stock throws Insufficient stock error', () => {
      stockEngine.executeMovement({ type: 'INGRESO', warehouseId: 'wh-1', itemId: 'it-1', quantity: 5, unitCost: 100 });
      expect(() => {
        stockEngine.executeMovement({ type: 'SALIDA', warehouseId: 'wh-1', itemId: 'it-1', quantity: 6 });
      }).toThrow('Insufficient stock');
    });

    it('LOGIC-STOCK-LOCK-B04: Concurrent race: two draws on last items serialize and second fails', () => {
      stockEngine.executeMovement({ type: 'INGRESO', warehouseId: 'wh-1', itemId: 'it-race', quantity: 5, unitCost: 100 });

      // Crew 1 takes 4 units
      stockEngine.executeMovement({ type: 'SALIDA', warehouseId: 'wh-1', itemId: 'it-race', quantity: 4 });
      expect(stockEngine.getStock('it-race', 'wh-1').quantity).toBe(1);

      // Crew 2 asks for 3 units -> Must fail cleanly without corrupting stock to -2
      expect(() => {
        stockEngine.executeMovement({ type: 'SALIDA', warehouseId: 'wh-1', itemId: 'it-race', quantity: 3 });
      }).toThrow('Insufficient stock');

      expect(stockEngine.getStock('it-race', 'wh-1').quantity).toBe(1); // Still 1!
    });

    it('LOGIC-STOCK-LOCK-B05: Row lock is safely released even if movement execution fails', () => {
      stockEngine.executeMovement({ type: 'INGRESO', warehouseId: 'wh-1', itemId: 'it-err', quantity: 2, unitCost: 100 });
      try {
        stockEngine.executeMovement({ type: 'SALIDA', warehouseId: 'wh-1', itemId: 'it-err', quantity: 10 });
      } catch (e) {
        // Expected
      }
      // Can acquire lock and perform valid movement
      const res = stockEngine.executeMovement({ type: 'SALIDA', warehouseId: 'wh-1', itemId: 'it-err', quantity: 1 });
      expect(res.stock.quantity).toBe(1);
    });
  });

  // -------------------------------------------------------------
  // Feature 10: LOGIC-PMP-DECIMAL (Boundary Cases)
  // -------------------------------------------------------------
  describe('Boundary: LOGIC-PMP-DECIMAL — Precision, Large Numbers & Override Prevention', () => {
    it('LOGIC-PMP-DECIMAL-B01: Initial INGRESO with zero prior stock sets PMP exactly equal to unitCost', () => {
      stockEngine.executeMovement({ type: 'INGRESO', warehouseId: 'wh-1', itemId: 'it-init', quantity: 10, unitCost: 3500 });
      expect(stockEngine.getStock('it-init', 'wh-1').averageCost).toBe(3500);
    });

    it('LOGIC-PMP-DECIMAL-B02: High precision decimal calculation does not lose precision', () => {
      // 12.5 units @ 100.50 = 1256.25
      stockEngine.executeMovement({ type: 'INGRESO', warehouseId: 'wh-1', itemId: 'it-dec', quantity: 12.5, unitCost: 100.5 });
      // 12.5 units @ 200.50 = 2506.25. Total = 3762.5 / 25 = 150.5
      stockEngine.executeMovement({ type: 'INGRESO', warehouseId: 'wh-1', itemId: 'it-dec', quantity: 12.5, unitCost: 200.5 });
      const stock = stockEngine.getStock('it-dec', 'wh-1');
      expect(stock.averageCost).toBe(150.5);
    });

    it('LOGIC-PMP-DECIMAL-B03: Large value calculation handles million-peso volumes safely', () => {
      stockEngine.executeMovement({ type: 'INGRESO', warehouseId: 'wh-1', itemId: 'it-large', quantity: 1000, unitCost: 1500000 });
      const stock = stockEngine.getStock('it-large', 'wh-1');
      expect(stock.quantity).toBe(1000);
      expect(stock.averageCost).toBe(1500000);
    });

    it('LOGIC-PMP-DECIMAL-B04: Client passing fake unitCost on SALIDA is strictly overridden by active PMP', () => {
      stockEngine.executeMovement({ type: 'INGRESO', warehouseId: 'wh-1', itemId: 'it-spoof', quantity: 10, unitCost: 8000 });
      const res = stockEngine.executeMovement({
        type: 'SALIDA',
        warehouseId: 'wh-1',
        itemId: 'it-spoof',
        quantity: 2,
        unitCost: 1, // Attacker attempts to register salida at $1
      });
      expect(res.kardexEntry.stampedUnitCost).toBe(8000);
      expect(res.kardexEntry.totalCost).toBe(16000);
    });

    it('LOGIC-PMP-DECIMAL-B05: AJUSTE with zero quantity sets stock to zero without math errors', () => {
      stockEngine.executeMovement({ type: 'INGRESO', warehouseId: 'wh-1', itemId: 'it-zero', quantity: 10, unitCost: 5000 });
      stockEngine.executeMovement({ type: 'AJUSTE', warehouseId: 'wh-1', itemId: 'it-zero', quantity: 0, unitCost: 0 });
      const stock = stockEngine.getStock('it-zero', 'wh-1');
      expect(stock.quantity).toBe(0);
    });
  });

  // -------------------------------------------------------------
  // Feature 11: LOGIC-KARDEX-ISOLATE (Boundary Cases)
  // -------------------------------------------------------------
  describe('Boundary: LOGIC-KARDEX-ISOLATE — Missing Filters & Edge Queries', () => {
    it('LOGIC-KARDEX-ISOLATE-B01: Query with null warehouseId throws validation error', () => {
      expect(() => {
        stockEngine.queryKardex({ warehouseId: null });
      }).toThrow('WarehouseId is strictly required');
    });

    it('LOGIC-KARDEX-ISOLATE-B02: Query for item with zero movements in warehouse returns empty array', () => {
      const result = stockEngine.queryKardex({ itemId: 'no-movements-item', warehouseId: 'wh-1' });
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('LOGIC-KARDEX-ISOLATE-B03: Date range filter excludes movements outside date bounds', () => {
      const d1 = new Date('2026-10-01T10:00:00Z');
      const d2 = new Date('2026-10-05T10:00:00Z');
      const d3 = new Date('2026-10-10T10:00:00Z');

      stockEngine.executeMovement({ type: 'INGRESO', warehouseId: 'wh-1', itemId: 'it-d', quantity: 1, unitCost: 10, date: d1 });
      stockEngine.executeMovement({ type: 'INGRESO', warehouseId: 'wh-1', itemId: 'it-d', quantity: 1, unitCost: 10, date: d2 });
      stockEngine.executeMovement({ type: 'INGRESO', warehouseId: 'wh-1', itemId: 'it-d', quantity: 1, unitCost: 10, date: d3 });

      const filtered = stockEngine.queryKardex({
        warehouseId: 'wh-1',
        itemId: 'it-d',
        startDate: '2026-10-02T00:00:00Z',
        endDate: '2026-10-06T00:00:00Z',
      });
      expect(filtered.length).toBe(1);
      expect(filtered[0].date).toBe(d2.toISOString());
    });

    it('LOGIC-KARDEX-ISOLATE-B04: Looking up uninitialized stock returns default 0 quantity and 0 cost', () => {
      const stock = stockEngine.getStock('non-existent-item', 'wh-1');
      expect(stock.quantity).toBe(0);
      expect(stock.averageCost).toBe(0);
    });

    it('LOGIC-KARDEX-ISOLATE-B05: High volume movements across 3 warehouses remain mutually isolated', () => {
      for (let i = 0; i < 10; i++) {
        stockEngine.executeMovement({ type: 'INGRESO', warehouseId: 'wh-A', itemId: 'item-iso', quantity: 1, unitCost: 10 });
        stockEngine.executeMovement({ type: 'INGRESO', warehouseId: 'wh-B', itemId: 'item-iso', quantity: 2, unitCost: 20 });
        stockEngine.executeMovement({ type: 'INGRESO', warehouseId: 'wh-C', itemId: 'item-iso', quantity: 3, unitCost: 30 });
      }
      expect(stockEngine.getStock('item-iso', 'wh-A').quantity).toBe(10);
      expect(stockEngine.getStock('item-iso', 'wh-B').quantity).toBe(20);
      expect(stockEngine.getStock('item-iso', 'wh-C').quantity).toBe(30);
    });
  });

  // -------------------------------------------------------------
  // Feature 12: LOGIC-FOLIO-GEN (Boundary Cases)
  // -------------------------------------------------------------
  describe('Boundary: LOGIC-FOLIO-GEN — Concurrency & Multi-Sequence Integrity', () => {
    it('LOGIC-FOLIO-GEN-B01: 50 consecutive folios generate strictly distinct non-colliding strings', () => {
      const set = new Set();
      for (let i = 0; i < 50; i++) {
        const folio = stockEngine.generateMovementFolio(new Date('2026-10-02'));
        set.add(folio);
      }
      expect(set.size).toBe(50);
    });

    it('LOGIC-FOLIO-GEN-B02: Sequences past 9999 preserve unique sequential format', () => {
      const prefix = 'MOV-202610';
      stockEngine.folioCounters.set(prefix, 9999);
      const folio10k = stockEngine.generateMovementFolio(new Date('2026-10-02'));
      expect(folio10k).toBe('MOV-202610-10000');
    });

    it('LOGIC-FOLIO-GEN-B03: Movement, Purchase Order, and Field Request sequences are independent', () => {
      const mov = stockEngine.generateMovementFolio(new Date('2026-10-02'));
      const oc = purchaseEngine.generateOCFolio(new Date('2026-10-02'));
      const st = purchaseEngine.generateSTFolio(new Date('2026-10-02'));

      expect(mov).toBe('MOV-202610-0001');
      expect(oc).toBe('OC-202610-0001');
      expect(st).toBe('ST-202610-0001');
    });

    it('LOGIC-FOLIO-GEN-B04: Year rollover from December 2026 to January 2027 resets sequence', () => {
      const dec = stockEngine.generateMovementFolio(new Date('2026-12-15'));
      const jan = stockEngine.generateMovementFolio(new Date('2027-01-05'));
      expect(dec).toBe('MOV-202612-0001');
      expect(jan).toBe('MOV-202701-0001');
    });

    it('LOGIC-FOLIO-GEN-B05: Folios generated on leap year dates format correctly', () => {
      const leap = stockEngine.generateMovementFolio(new Date('2028-02-29'));
      expect(leap).toBe('MOV-202802-0001');
    });
  });

  // -------------------------------------------------------------
  // Feature 13: LOGIC-OC-FSM (Boundary Cases)
  // -------------------------------------------------------------
  describe('Boundary: LOGIC-OC-FSM — Invalid Transitions & Terminal State Guards', () => {
    let order;

    beforeEach(() => {
      order = purchaseEngine.createPurchaseOrder({
        supplierId: 's1',
        lines: [{ itemId: 'i1', quantity: 1, unitPrice: 1000 }],
      });
    });

    it('LOGIC-OC-FSM-B01: Transitioning RECHAZADA order to APROBADA is strictly rejected', () => {
      purchaseEngine.transitionPurchaseOrder(order.id, 'PENDIENTE_APROBACION');
      purchaseEngine.transitionPurchaseOrder(order.id, 'RECHAZADA');
      expect(() => {
        purchaseEngine.transitionPurchaseOrder(order.id, 'APROBADA');
      }).toThrow('Cannot move Purchase Order from RECHAZADA to APROBADA');
    });

    it('LOGIC-OC-FSM-B02: Transitioning CANCELADA order to any status is strictly rejected', () => {
      purchaseEngine.transitionPurchaseOrder(order.id, 'CANCELADA');
      expect(() => {
        purchaseEngine.transitionPurchaseOrder(order.id, 'BORRADOR');
      }).toThrow('Cannot move Purchase Order from CANCELADA');
    });

    it('LOGIC-OC-FSM-B03: Direct jump from BORRADOR to RECEPCION_TOTAL is strictly rejected', () => {
      expect(() => {
        purchaseEngine.transitionPurchaseOrder(order.id, 'RECEPCION_TOTAL');
      }).toThrow('Cannot move Purchase Order from BORRADOR to RECEPCION_TOTAL');
    });

    it('LOGIC-OC-FSM-B04: Transitioning terminal RECEPCION_TOTAL order to any status is rejected', () => {
      purchaseEngine.transitionPurchaseOrder(order.id, 'PENDIENTE_APROBACION');
      purchaseEngine.transitionPurchaseOrder(order.id, 'APROBADA');
      purchaseEngine.transitionPurchaseOrder(order.id, 'EMITIDA');
      purchaseEngine.transitionPurchaseOrder(order.id, 'RECEPCION_TOTAL');

      expect(() => {
        purchaseEngine.transitionPurchaseOrder(order.id, 'BORRADOR');
      }).toThrow('Cannot move Purchase Order from RECEPCION_TOTAL');
    });

    it('LOGIC-OC-FSM-B05: Non-existent target status throws invalid transition error', () => {
      expect(() => {
        purchaseEngine.transitionPurchaseOrder(order.id, 'NON_EXISTENT_STATUS');
      }).toThrow('Invalid transition');
    });
  });

  // -------------------------------------------------------------
  // Feature 14: LOGIC-APPROVAL-LIMIT (Boundary Cases)
  // -------------------------------------------------------------
  describe('Boundary: LOGIC-APPROVAL-LIMIT — Threshold Overflows & SuperKey Authentication', () => {
    it('LOGIC-APPROVAL-LIMIT-B01: Order exceeding limit by 1 peso strictly rejected without superKey', () => {
      const order = purchaseEngine.createPurchaseOrder({
        supplierId: 's1',
        lines: [{ itemId: 'i1', quantity: 1, unitPrice: 5000001 }], // 5,000,001
      });
      purchaseEngine.transitionPurchaseOrder(order.id, 'PENDIENTE_APROBACION');

      expect(() => {
        purchaseEngine.transitionPurchaseOrder(order.id, 'APROBADA', { maxApprovalAmount: 5000000 });
      }).toThrow('ApprovalLimitExceeded');
    });

    it('LOGIC-APPROVAL-LIMIT-B02: Exception approval with incorrect superKey strictly rejected', () => {
      const order = purchaseEngine.createPurchaseOrder({
        supplierId: 's1',
        lines: [{ itemId: 'i1', quantity: 1, unitPrice: 10000000 }],
      });
      purchaseEngine.transitionPurchaseOrder(order.id, 'PENDIENTE_APROBACION');

      expect(() => {
        purchaseEngine.transitionPurchaseOrder(order.id, 'APROBADA_EXCEPCION', { maxApprovalAmount: 5000000 }, {
          superKey: 'wrong-key-123',
        });
      }).toThrow('Invalid or missing superKey');
    });

    it('LOGIC-APPROVAL-LIMIT-B03: Exception approval with empty superKey rejected', () => {
      const order = purchaseEngine.createPurchaseOrder({
        supplierId: 's1',
        lines: [{ itemId: 'i1', quantity: 1, unitPrice: 10000000 }],
      });
      purchaseEngine.transitionPurchaseOrder(order.id, 'PENDIENTE_APROBACION');

      expect(() => {
        purchaseEngine.transitionPurchaseOrder(order.id, 'APROBADA_EXCEPCION', { maxApprovalAmount: 5000000 }, {
          superKey: '',
        });
      }).toThrow('Invalid or missing superKey');
    });

    it('LOGIC-APPROVAL-LIMIT-B04: Creating order with zero lines throws validation error', () => {
      expect(() => {
        purchaseEngine.createPurchaseOrder({ supplierId: 's1', lines: [] });
      }).toThrow('Purchase Order requires at least one line');
    });

    it('LOGIC-APPROVAL-LIMIT-B05: Creating order with negative unit price throws validation error', () => {
      expect(() => {
        purchaseEngine.createPurchaseOrder({
          supplierId: 's1',
          lines: [{ itemId: 'i1', quantity: 1, unitPrice: -500 }],
        });
      }).toThrow('Line quantity must be > 0 and price >= 0');
    });
  });

  // -------------------------------------------------------------
  // Feature 15: LOGIC-ST-WORKFLOW (Boundary Cases)
  // -------------------------------------------------------------
  describe('Boundary: LOGIC-ST-WORKFLOW — Field Request Edge Lifecycle', () => {
    it('LOGIC-ST-WORKFLOW-B01: Cannot convert RECHAZADA field request to purchase order', () => {
      const req = purchaseEngine.createFieldRequest({ faenaId: 'f1', requesterId: 'u1', justification: 'repuestos' });
      purchaseEngine.transitionFieldRequest(req.id, 'PENDIENTE');
      purchaseEngine.transitionFieldRequest(req.id, 'RECHAZADA');

      expect(() => {
        purchaseEngine.convertFieldRequestToPO(req.id, 'supp-1', [{ itemId: 'i1', quantity: 1, unitPrice: 100 }]);
      }).toThrow('Only APROBADA field requests can be converted');
    });

    it('LOGIC-ST-WORKFLOW-B02: Cannot convert BORRADOR field request to purchase order', () => {
      const req = purchaseEngine.createFieldRequest({ faenaId: 'f1', requesterId: 'u1', justification: 'repuestos' });
      expect(() => {
        purchaseEngine.convertFieldRequestToPO(req.id, 'supp-1', [{ itemId: 'i1', quantity: 1, unitPrice: 100 }]);
      }).toThrow('Only APROBADA field requests can be converted');
    });

    it('LOGIC-ST-WORKFLOW-B03: Cannot re-convert already CONVERTIDA field request', () => {
      const req = purchaseEngine.createFieldRequest({ faenaId: 'f1', requesterId: 'u1', justification: 'repuestos' });
      purchaseEngine.transitionFieldRequest(req.id, 'PENDIENTE');
      purchaseEngine.transitionFieldRequest(req.id, 'APROBADA');
      purchaseEngine.convertFieldRequestToPO(req.id, 'supp-1', [{ itemId: 'i1', quantity: 1, unitPrice: 100 }]);

      expect(() => {
        purchaseEngine.convertFieldRequestToPO(req.id, 'supp-1', [{ itemId: 'i1', quantity: 1, unitPrice: 100 }]);
      }).toThrow('Only APROBADA field requests can be converted');
    });

    it('LOGIC-ST-WORKFLOW-B04: Creating field request with empty or whitespace justification throws error', () => {
      expect(() => {
        purchaseEngine.createFieldRequest({ faenaId: 'f1', requesterId: 'u1', justification: '   ' });
      }).toThrow('Justification is required');
    });

    it('LOGIC-ST-WORKFLOW-B05: Creating field request without Faena ID throws error', () => {
      expect(() => {
        purchaseEngine.createFieldRequest({ faenaId: null, requesterId: 'u1', justification: 'urgente' });
      }).toThrow('Faena ID is required');
    });
  });

  // -------------------------------------------------------------
  // Feature 16: LOGIC-SOFT-DELETE (Boundary Cases)
  // -------------------------------------------------------------
  describe('Boundary: LOGIC-SOFT-DELETE — Foreign Key Blocks & Idempotency', () => {
    it('LOGIC-SOFT-DELETE-B01: Soft-deleting non-existent ID throws P2025 record not found', () => {
      expect(() => {
        entityManager.softDelete('Supplier', 'non-existent-id');
      }).toThrow();
    });

    it('LOGIC-SOFT-DELETE-B02: Soft-deleting already inactive entity is idempotent', () => {
      const faena = entityManager.create('Faena', { name: 'Mina 1' });
      const del1 = entityManager.softDelete('Faena', faena.id);
      const del2 = entityManager.softDelete('Faena', faena.id);
      expect(del1.isActive).toBe(false);
      expect(del2.isActive).toBe(false);
    });

    it('LOGIC-SOFT-DELETE-B03: Physical delete on entity with active dependents throws P2003', () => {
      const supp = entityManager.create('Supplier', { name: 'S1' });
      expect(() => {
        entityManager.hardDelete('Supplier', supp.id, true);
      }).toThrow('Foreign key violation');
    });

    it('LOGIC-SOFT-DELETE-B04: Soft-deleted entity does not appear in findActive', () => {
      const wh = entityManager.create('Warehouse', { name: 'Antigua' });
      entityManager.softDelete('Warehouse', wh.id);
      const active = entityManager.findActive('Warehouse');
      expect(active.find(w => w.id === wh.id)).toBeUndefined();
    });

    it('LOGIC-SOFT-DELETE-B05: Multiple entities soft-deleted independently retain accurate state', () => {
      const e1 = entityManager.create('Item', { code: 'A' });
      const e2 = entityManager.create('Item', { code: 'B' });
      entityManager.softDelete('Item', e1.id);
      expect(entityManager.findActive('Item').length).toBe(1);
      expect(entityManager.findActive('Item')[0].id).toBe(e2.id);
    });
  });

  // -------------------------------------------------------------
  // Feature 17: LOGIC-DB-FILTER (Boundary Cases)
  // -------------------------------------------------------------
  describe('Boundary: LOGIC-DB-FILTER — Multiple Constraint Fields & Edge Errors', () => {
    it('LOGIC-DB-FILTER-B01: Multiple fields in P2002 error target are formatted as comma list', () => {
      const err = new Error('Unique violation');
      err.code = 'P2002';
      err.meta = { target: ['itemId', 'warehouseId'] };
      const res = PrismaClientExceptionFilter.catch(err);
      expect(res.statusCode).toBe(409);
      expect(res.message).toContain('itemId, warehouseId');
    });

    it('LOGIC-DB-FILTER-B02: P2003 foreign key error without field_name metadata defaults cleanly', () => {
      const err = new Error('FK violation');
      err.code = 'P2003';
      err.meta = {};
      const res = PrismaClientExceptionFilter.catch(err);
      expect(res.statusCode).toBe(400);
      expect(res.message).toContain('relation');
    });

    it('LOGIC-DB-FILTER-B03: P2025 error without cause metadata uses standard default message', () => {
      const err = new Error('Record not found');
      err.code = 'P2025';
      err.meta = {};
      const res = PrismaClientExceptionFilter.catch(err);
      expect(res.statusCode).toBe(404);
      expect(res.message).toBe('Record to update or delete does not exist.');
    });

    it('LOGIC-DB-FILTER-B04: Unhandled database panic returns HTTP 500 without leaking stack trace', () => {
      const err = new Error('Fatal connection drop: postgresql://secret_user:secret_pass@db:5432/sgmt');
      err.code = 'P1001';
      const res = PrismaClientExceptionFilter.catch(err);
      expect(res.statusCode).toBe(500);
      expect(res.message).not.toContain('secret_pass');
    });

    it('LOGIC-DB-FILTER-B05: Response object strictly adheres to standard shape', () => {
      const err = new Error('Error');
      err.code = 'P2002';
      const res = PrismaClientExceptionFilter.catch(err);
      expect(Object.keys(res)).toEqual(['statusCode', 'error', 'message']);
    });
  });
});
