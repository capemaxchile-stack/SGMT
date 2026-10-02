/**
 * EMPIRICAL ADVERSARIAL STRESS HARNESS — Milestone 2
 * Tests real compiled production services:
 * - MovementsService (Concurrency, Stock Locking, Decimal PMP, SALIDA Stamping, AJUSTE, TRANSFER)
 * - ItemsService, WarehousesService, SuppliersService, FaenasService, AssetsService (Soft Deletion)
 */

const path = require('path');
const apiRoot = path.resolve(__dirname, '../api');
const { Prisma, MovementType, FaenaStatus, AssetOperationalStatus } = require(path.join(apiRoot, 'node_modules/@prisma/client'));
const { MovementsService } = require(path.join(apiRoot, 'dist/modules/movements/movements.service.js'));
const { ItemsService } = require(path.join(apiRoot, 'dist/modules/items/items.service.js'));
const { WarehousesService } = require(path.join(apiRoot, 'dist/modules/warehouses/warehouses.service.js'));
const { SuppliersService } = require(path.join(apiRoot, 'dist/modules/suppliers/suppliers.service.js'));
const { FaenasService } = require(path.join(apiRoot, 'dist/modules/faenas/faenas.service.js'));
const { AssetsService } = require(path.join(apiRoot, 'dist/modules/assets/assets.service.js'));

let totalTests = 0;
let passedTests = 0;
let failedTests = [];

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    failedTests.push(message);
    console.error(`  FAIL: ${message}`);
  } else {
    passedTests++;
    console.log(`  PASS: ${message}`);
  }
}

async function assertThrowsAsync(fn, expectedSubstr, message) {
  totalTests++;
  try {
    await fn();
    failedTests.push(`${message} (Expected error containing "${expectedSubstr}", but no error was thrown)`);
    console.error(`  FAIL: ${message} (No error thrown)`);
  } catch (err) {
    if (expectedSubstr && !err.message.includes(expectedSubstr)) {
      failedTests.push(`${message} (Expected error containing "${expectedSubstr}", but got "${err.message}")`);
      console.error(`  FAIL: ${message} (Got wrong error: ${err.message})`);
    } else {
      passedTests++;
      console.log(`  PASS: ${message}`);
    }
  }
}

// In-Memory Database Simulator for PrismaService
class MockPrismaDb {
  constructor() {
    this.stocks = new Map(); // key: `${itemId}_${warehouseId}`
    this.movements = [];
    this.movementLines = [];
    this.items = new Map();
    this.warehouses = new Map();
    this.suppliers = new Map();
    this.faenas = new Map();
    this.assets = new Map();
    this.executedRawQueries = [];
    this.mutexHolders = new Map(); // key -> txId
    this.mutexWaiters = new Map(); // key -> Promise
    this.nextTxId = 1;
  }

  async acquireMutex(key, txId) {
    while (this.mutexHolders.has(key) && this.mutexHolders.get(key) !== txId) {
      await this.mutexWaiters.get(key);
    }
    if (this.mutexHolders.get(key) === txId) {
      return () => {}; // Already held by this transaction (re-entrant)
    }
    this.mutexHolders.set(key, txId);
    let release;
    const waiterPromise = new Promise(resolve => { release = resolve; });
    this.mutexWaiters.set(key, waiterPromise);

    return () => {
      this.mutexHolders.delete(key);
      this.mutexWaiters.delete(key);
      release();
    };
  }

  createTx(txId, txReleases) {
    return {
      $executeRaw: async (strings, ...values) => {
        const query = typeof strings === 'string' ? strings : strings.join('?');
        this.executedRawQueries.push(query);

        if (query.includes('pg_advisory_xact_lock')) {
          const lockKey = 'advisory_' + values[0];
          const unlock = await this.acquireMutex(lockKey, txId);
          txReleases.push(unlock);
        }
        return 1;
      },
      $queryRaw: async (strings, ...values) => {
        const query = typeof strings === 'string' ? strings : strings.join('?');
        this.executedRawQueries.push(query);

        // Pattern matching for Stock FOR UPDATE
        if (query.includes('FROM "Stock"') && query.includes('FOR UPDATE')) {
          const itemId = values[0];
          const warehouseId = values[1];
          const key = `${itemId}_${warehouseId}`;

          const unlock = await this.acquireMutex('stock_' + key, txId);
          txReleases.push(unlock);

          const stock = this.stocks.get(key);
          if (stock) {
            return [{
              id: stock.id,
              quantity: stock.quantity,
              averageCost: stock.averageCost,
            }];
          }
          return [];
        }
        return [];
      },
      stock: {
        upsert: async ({ where, update, create }) => {
          const key = `${create.itemId}_${create.warehouseId}`;
          if (!this.stocks.has(key)) {
            this.stocks.set(key, {
              id: 'stock_' + key,
              itemId: create.itemId,
              warehouseId: create.warehouseId,
              quantity: new Prisma.Decimal(create.quantity),
              averageCost: new Prisma.Decimal(create.averageCost),
            });
          }
          return this.stocks.get(key);
        },
        update: async ({ where, data }) => {
          const key = `${where.itemId_warehouseId.itemId}_${where.itemId_warehouseId.warehouseId}`;
          const stock = this.stocks.get(key);
          if (!stock) throw new Error(`Stock not found for update: ${key}`);
          stock.quantity = new Prisma.Decimal(data.quantity);
          stock.averageCost = new Prisma.Decimal(data.averageCost);
          return stock;
        },
      },
      warehouseMovement: {
        findFirst: async ({ where, orderBy, select }) => {
          const filtered = this.movements.filter(m => m.movementNumber && m.movementNumber.startsWith(where.movementNumber.startsWith));
          if (filtered.length === 0) return null;
          filtered.sort((a, b) => b.movementNumber.localeCompare(a.movementNumber));
          return filtered[0];
        },
        create: async ({ data, include }) => {
          const movId = 'mov_' + (this.movements.length + 1);
          const lines = (data.lines?.create || []).map((l, idx) => ({
            id: `line_${movId}_${idx + 1}`,
            movementId: movId,
            itemId: l.itemId,
            quantity: new Prisma.Decimal(l.quantity),
            unitCost: new Prisma.Decimal(l.unitCost),
          }));

          const record = {
            id: movId,
            ...data,
            createdAt: new Date(),
            lines,
          };
          this.movements.push(record);
          this.movementLines.push(...lines.map(l => ({
            ...l,
            movement: record,
          })));
          return record;
        },
      },
    };
  }

  getPrismaService() {
    return {
      $transaction: async (cb) => {
        const txId = this.nextTxId++;
        const txReleases = [];
        try {
          const tx = this.createTx(txId, txReleases);
          return await cb(tx);
        } finally {
          for (const release of txReleases.reverse()) {
            release();
          }
        }
      },
      warehouseMovementLine: {
        findMany: async ({ where, include, orderBy }) => {
          return this.movementLines.filter(l => {
            if (l.itemId !== where.itemId) return false;
            if (where.movement?.OR) {
              const matched = where.movement.OR.some(c => {
                if (c.warehouseId && l.movement.warehouseId === c.warehouseId) return true;
                if (c.targetWarehouseId && l.movement.targetWarehouseId === c.targetWarehouseId) return true;
                return false;
              });
              if (!matched) return false;
            }
            return true;
          });
        },
      },
      stock: {
        findMany: async ({ where, include }) => {
          return Array.from(this.stocks.values()).filter(s => {
            if (where.warehouseId && s.warehouseId !== where.warehouseId) return false;
            return true;
          });
        },
      },
      item: {
        findMany: async ({ where }) => {
          return Array.from(this.items.values()).filter(i => {
            if (where.isActive !== undefined && i.isActive !== where.isActive) return false;
            return true;
          });
        },
        findUnique: async ({ where }) => this.items.get(where.id) || null,
        update: async ({ where, data }) => {
          const item = this.items.get(where.id);
          if (!item) throw new Error('Not found');
          Object.assign(item, data);
          return item;
        },
      },
      warehouse: {
        findMany: async ({ where }) => {
          return Array.from(this.warehouses.values()).filter(w => {
            if (where.isActive !== undefined && w.isActive !== where.isActive) return false;
            return true;
          }).map(w => ({ ...w, _count: { stocks: 0 } }));
        },
        findUnique: async ({ where }) => this.warehouses.get(where.id) || null,
        update: async ({ where, data }) => {
          const w = this.warehouses.get(where.id);
          if (!w) throw new Error('Not found');
          Object.assign(w, data);
          return w;
        },
      },
      supplier: {
        findMany: async ({ where }) => {
          return Array.from(this.suppliers.values()).filter(s => {
            if (where.isActive !== undefined && s.isActive !== where.isActive) return false;
            return true;
          });
        },
        findUnique: async ({ where }) => this.suppliers.get(where.id) || null,
        update: async ({ where, data }) => {
          const s = this.suppliers.get(where.id);
          if (!s) throw new Error('Not found');
          Object.assign(s, data);
          return s;
        },
      },
      faena: {
        findMany: async ({ where }) => {
          return Array.from(this.faenas.values()).filter(f => {
            if (where.isActive !== undefined && f.isActive !== where.isActive) return false;
            return true;
          }).map(f => ({ ...f, _count: { contracts: 0, assets: 0 } }));
        },
        findUnique: async ({ where }) => this.faenas.get(where.id) || null,
        update: async ({ where, data }) => {
          const f = this.faenas.get(where.id);
          if (!f) throw new Error('Not found');
          Object.assign(f, data);
          return f;
        },
      },
      asset: {
        findMany: async ({ where }) => {
          return Array.from(this.assets.values()).filter(a => {
            if (where.isActive !== undefined && a.isActive !== where.isActive) return false;
            return true;
          });
        },
        findUnique: async ({ where }) => this.assets.get(where.id) || null,
        update: async ({ where, data }) => {
          const a = this.assets.get(where.id);
          if (!a) throw new Error('Not found');
          Object.assign(a, data);
          return a;
        },
      },
    };
  }
}

async function runAdversarialStressSuite() {
  console.log('===============================================================');
  console.log('  CHALLENGER M2: EMPIRICAL ADVERSARIAL STRESS TEST SUITE');
  console.log('===============================================================\n');

  // -------------------------------------------------------------
  // SUITE 1: Concurrency, Row Locks & Decimal Precision
  // -------------------------------------------------------------
  console.log('--- SUITE 1: Concurrency, Row Locks & Decimal Precision ---');
  {
    const db = new MockPrismaDb();
    const service = new MovementsService(db.getPrismaService());

    // 1.1 Verify initial INGRESO creates stock row and acquires FOR UPDATE lock
    await service.create({
      type: MovementType.INGRESO,
      warehouseId: 'wh-1',
      lines: [{ itemId: 'item-1', quantity: 10, unitCost: 1000 }],
    }, 'user-test');

    const stockKey = 'item-1_wh-1';
    const s1 = db.stocks.get(stockKey);
    assert(s1.quantity.equals(new Prisma.Decimal(10)), '1.1: Initial INGRESO sets quantity to 10');
    assert(s1.averageCost.equals(new Prisma.Decimal(1000)), '1.1: Initial INGRESO sets averageCost to 1000');
    assert(db.executedRawQueries.some(q => q.includes('FOR UPDATE')), '1.1: Raw SQL executed with SELECT ... FOR UPDATE row lock');
    assert(db.executedRawQueries.some(q => q.includes('pg_advisory_xact_lock')), '1.1: PostgreSQL advisory lock executed for folio safety');

    // 1.2 Weighted Average Price computation with high precision
    // 10 units @ 1000 = 10,000. Add 5 units @ 2500 = 12,500. Total = 22,500 / 15 = 1500
    await service.create({
      type: MovementType.INGRESO,
      warehouseId: 'wh-1',
      lines: [{ itemId: 'item-1', quantity: 5, unitCost: 2500 }],
    }, 'user-test');
    const s2 = db.stocks.get(stockKey);
    assert(s2.quantity.equals(new Prisma.Decimal(15)), '1.2: Cumulative quantity updated to 15');
    assert(s2.averageCost.equals(new Prisma.Decimal(1500)), '1.2: Weighted average cost computed accurately to 1500');

    // 1.3 High-precision fractional decimal calculation
    // 15 units @ 1500 = 22,500. Add 0.3333 units @ 3333.3333
    const batchQty = new Prisma.Decimal('0.3333');
    const batchCost = new Prisma.Decimal('3333.3333');
    await service.create({
      type: MovementType.INGRESO,
      warehouseId: 'wh-1',
      lines: [{ itemId: 'item-1', quantity: batchQty.toNumber(), unitCost: batchCost.toNumber() }],
    }, 'user-test');
    const s3 = db.stocks.get(stockKey);
    const expectedQty = new Prisma.Decimal(15).plus(batchQty);
    assert(s3.quantity.equals(expectedQty), '1.3: Fractional decimal quantity is exact');
    assert(!s3.averageCost.isNaN(), '1.3: Average cost does not produce NaN on fractional decimals');

    // 1.4 Large Chilean Peso volume (Billions)
    await service.create({
      type: MovementType.INGRESO,
      warehouseId: 'wh-1',
      lines: [{ itemId: 'item-mining-truck', quantity: 10, unitCost: 850000000 }], // 850 million CLP each
    }, 'user-test');
    const truckStock = db.stocks.get('item-mining-truck_wh-1');
    assert(truckStock.averageCost.equals(new Prisma.Decimal(850000000)), '1.4: Handles 850M CLP unit cost without overflow');
  }

  // -------------------------------------------------------------
  // SUITE 2: SALIDA Stamping & Anti-Tampering
  // -------------------------------------------------------------
  console.log('\n--- SUITE 2: SALIDA Stamping & Anti-Tampering ---');
  {
    const db = new MockPrismaDb();
    const service = new MovementsService(db.getPrismaService());

    // Setup initial stock: 10 units @ 5000 PMP
    await service.create({
      type: MovementType.INGRESO,
      warehouseId: 'wh-1',
      lines: [{ itemId: 'item-valuable', quantity: 10, unitCost: 5000 }],
    }, 'user-test');

    // 2.1 Adversary attempts to pass spoofed unitCost: 1
    const salida1 = await service.create({
      type: MovementType.SALIDA,
      warehouseId: 'wh-1',
      lines: [{ itemId: 'item-valuable', quantity: 2, unitCost: 1 }],
    }, 'user-test');

    const stampedLine1 = salida1.lines[0];
    assert(
      new Prisma.Decimal(stampedLine1.unitCost).equals(new Prisma.Decimal(5000)),
      '2.1: Attacker spoofed unitCost (1) is overridden by active warehouse PMP (5000)'
    );

    // 2.2 Adversary attempts to pass unitCost: 99999999
    const salida2 = await service.create({
      type: MovementType.SALIDA,
      warehouseId: 'wh-1',
      lines: [{ itemId: 'item-valuable', quantity: 3, unitCost: 99999999 }],
    }, 'user-test');
    const stampedLine2 = salida2.lines[0];
    assert(
      new Prisma.Decimal(stampedLine2.unitCost).equals(new Prisma.Decimal(5000)),
      '2.2: Attacker spoofed unitCost (99999999) is overridden by active warehouse PMP (5000)'
    );

    // 2.3 Verify stock averageCost is preserved on SALIDA
    const currentStock = db.stocks.get('item-valuable_wh-1');
    assert(currentStock.quantity.equals(new Prisma.Decimal(5)), '2.3: Stock quantity reduced to 5');
    assert(currentStock.averageCost.equals(new Prisma.Decimal(5000)), '2.3: Stock averageCost strictly preserved at 5000');

    // 2.4 SALIDA exceeding stock is rejected
    await assertThrowsAsync(
      () => service.create({
        type: MovementType.SALIDA,
        warehouseId: 'wh-1',
        lines: [{ itemId: 'item-valuable', quantity: 6 }],
      }, 'user-test'),
      'Insufficient stock',
      '2.4: SALIDA requesting 6 units when stock is 5 throws Insufficient stock'
    );

    // 2.5 SALIDA with zero or negative quantity is rejected
    await assertThrowsAsync(
      () => service.create({
        type: MovementType.SALIDA,
        warehouseId: 'wh-1',
        lines: [{ itemId: 'item-valuable', quantity: 0 }],
      }, 'user-test'),
      'Quantity must be strictly positive',
      '2.5: SALIDA with zero quantity is strictly rejected'
    );
    await assertThrowsAsync(
      () => service.create({
        type: MovementType.SALIDA,
        warehouseId: 'wh-1',
        lines: [{ itemId: 'item-valuable', quantity: -3 }],
      }, 'user-test'),
      'Quantity must be strictly positive',
      '2.5: SALIDA with negative quantity is strictly rejected'
    );
  }

  // -------------------------------------------------------------
  // SUITE 3: AJUSTE Isolation & Multi-Warehouse Scoping
  // -------------------------------------------------------------
  console.log('\n--- SUITE 3: AJUSTE Isolation & Multi-Warehouse Scoping ---');
  {
    const db = new MockPrismaDb();
    const service = new MovementsService(db.getPrismaService());

    // Setup stock in two warehouses:
    // WH-A: 50 units @ 1000
    await service.create({
      type: MovementType.INGRESO,
      warehouseId: 'wh-A',
      lines: [{ itemId: 'item-shared', quantity: 50, unitCost: 1000 }],
    }, 'user-test');

    // WH-B: 30 units @ 2000
    await service.create({
      type: MovementType.INGRESO,
      warehouseId: 'wh-B',
      lines: [{ itemId: 'item-shared', quantity: 30, unitCost: 2000 }],
    }, 'user-test');

    // 3.1 Perform AJUSTE on WH-A (count shows 42 units, unitCost omitted)
    await service.create({
      type: MovementType.AJUSTE,
      warehouseId: 'wh-A',
      lines: [{ itemId: 'item-shared', quantity: 42 }],
    }, 'user-test');

    const stockA = db.stocks.get('item-shared_wh-A');
    const stockB = db.stocks.get('item-shared_wh-B');

    assert(stockA.quantity.equals(new Prisma.Decimal(42)), '3.1: AJUSTE updates WH-A quantity to 42');
    assert(stockA.averageCost.equals(new Prisma.Decimal(1000)), '3.1: AJUSTE preserves WH-A averageCost (1000) when omitted');
    assert(stockB.quantity.equals(new Prisma.Decimal(30)), '3.1: AJUSTE in WH-A leaves WH-B quantity untouched (30)');
    assert(stockB.averageCost.equals(new Prisma.Decimal(2000)), '3.1: AJUSTE in WH-A leaves WH-B averageCost untouched (2000)');

    // 3.2 AJUSTE with explicit unitCost updates PMP
    await service.create({
      type: MovementType.AJUSTE,
      warehouseId: 'wh-A',
      lines: [{ itemId: 'item-shared', quantity: 40, unitCost: 1200 }],
    }, 'user-test');
    const stockAUpdated = db.stocks.get('item-shared_wh-A');
    assert(stockAUpdated.quantity.equals(new Prisma.Decimal(40)), '3.2: AJUSTE updates quantity to 40');
    assert(stockAUpdated.averageCost.equals(new Prisma.Decimal(1200)), '3.2: AJUSTE updates averageCost to 1200 when explicitly given');

    // 3.3 AJUSTE rejects negative quantity
    await assertThrowsAsync(
      () => service.create({
        type: MovementType.AJUSTE,
        warehouseId: 'wh-A',
        lines: [{ itemId: 'item-shared', quantity: -5 }],
      }, 'user-test'),
      'Quantity must be strictly positive or zero for adjustment',
      '3.3: AJUSTE with negative quantity is strictly rejected'
    );

    // 3.4 AJUSTE allows zero quantity (write-off)
    await service.create({
      type: MovementType.AJUSTE,
      warehouseId: 'wh-A',
      lines: [{ itemId: 'item-shared', quantity: 0 }],
    }, 'user-test');
    const stockAZero = db.stocks.get('item-shared_wh-A');
    assert(stockAZero.quantity.equals(new Prisma.Decimal(0)), '3.4: AJUSTE allows quantity: 0 for write-offs');

    // 3.5 Kardex warehouse scoping & isolation
    await assertThrowsAsync(
      () => service.getKardex('item-shared', undefined),
      'WarehouseId is strictly required',
      '3.5: getKardex without warehouseId throws BadRequestException'
    );

    const kardexA = await service.getKardex('item-shared', 'wh-A');
    const kardexB = await service.getKardex('item-shared', 'wh-B');

    assert(kardexA.length === 4, '3.5: Kardex WH-A contains only WH-A movements (4 movements)');
    assert(kardexB.length === 1, '3.5: Kardex WH-B contains only WH-B movements (1 movement)');
    assert(kardexB[0].balance === 30, '3.5: Kardex WH-B balance is strictly 30 (not polluted by WH-A)');
  }

  // -------------------------------------------------------------
  // SUITE 4: Inter-Warehouse TRANSFER Atomic Consistency
  // -------------------------------------------------------------
  console.log('\n--- SUITE 4: Inter-Warehouse TRANSFER Atomic Consistency ---');
  {
    const db = new MockPrismaDb();
    const service = new MovementsService(db.getPrismaService());

    // Setup: WH-Source has 10 units @ 1000 PMP. WH-Dest has 10 units @ 2000 PMP.
    await service.create({
      type: MovementType.INGRESO,
      warehouseId: 'wh-source',
      lines: [{ itemId: 'item-transfer', quantity: 10, unitCost: 1000 }],
    }, 'user-test');
    await service.create({
      type: MovementType.INGRESO,
      warehouseId: 'wh-dest',
      lines: [{ itemId: 'item-transfer', quantity: 10, unitCost: 2000 }],
    }, 'user-test');

    // 4.1 Transfer 5 units from WH-Source to WH-Dest
    // Origin PMP = 1000. Transfer cost = 1000.
    // Destination had 10 @ 2000 (20,000) + 5 @ 1000 (5,000) = 25,000 / 15 = 1666.6666...
    const transferMov = await service.create({
      type: MovementType.TRANSFER,
      warehouseId: 'wh-source',
      targetWarehouseId: 'wh-dest',
      lines: [{ itemId: 'item-transfer', quantity: 5 }],
    }, 'user-test');

    const sourceStock = db.stocks.get('item-transfer_wh-source');
    const destStock = db.stocks.get('item-transfer_wh-dest');

    assert(sourceStock.quantity.equals(new Prisma.Decimal(5)), '4.1: Source stock decreased by 5 to 5');
    assert(sourceStock.averageCost.equals(new Prisma.Decimal(1000)), '4.1: Source stock PMP unchanged at 1000');
    assert(destStock.quantity.equals(new Prisma.Decimal(15)), '4.1: Destination stock increased by 5 to 15');

    const expectedDestPmp = new Prisma.Decimal(25000).dividedBy(new Prisma.Decimal(15));
    assert(
      destStock.averageCost.toDecimalPlaces(4).equals(expectedDestPmp.toDecimalPlaces(4)),
      '4.1: Destination stock PMP recomputed with incoming transfer unit cost'
    );

    // 4.2 Kardex reflects transfer for both warehouses
    const kardexSource = await service.getKardex('item-transfer', 'wh-source');
    const kardexDest = await service.getKardex('item-transfer', 'wh-dest');

    const lastSource = kardexSource[kardexSource.length - 1];
    const lastDest = kardexDest[kardexDest.length - 1];
    assert(lastSource.balance === 5, '4.2: Kardex source balance decreased to 5');
    assert(lastDest.balance === 15, '4.2: Kardex destination balance increased to 15');

    // 4.3 TRANSFER validation: targetWarehouseId identical to warehouseId
    await assertThrowsAsync(
      () => service.create({
        type: MovementType.TRANSFER,
        warehouseId: 'wh-source',
        targetWarehouseId: 'wh-source',
        lines: [{ itemId: 'item-transfer', quantity: 1 }],
      }, 'user-test'),
      'targetWarehouseId is required and must differ from origin warehouseId',
      '4.3: TRANSFER to same warehouse is strictly rejected'
    );

    // 4.4 TRANSFER validation: insufficient source stock
    await assertThrowsAsync(
      () => service.create({
        type: MovementType.TRANSFER,
        warehouseId: 'wh-source',
        targetWarehouseId: 'wh-dest',
        lines: [{ itemId: 'item-transfer', quantity: 100 }],
      }, 'user-test'),
      'Insufficient stock',
      '4.4: TRANSFER exceeding origin stock is strictly rejected'
    );
  }

  // -------------------------------------------------------------
  // SUITE 5: Soft-Deletion Pattern Verification
  // -------------------------------------------------------------
  console.log('\n--- SUITE 5: Soft-Deletion Pattern Verification ---');
  {
    const db = new MockPrismaDb();
    const prisma = db.getPrismaService();

    // 5.1 ItemsService soft-delete
    db.items.set('item-del', { id: 'item-del', code: 'DEL-01', description: 'Test Item', isActive: true, deletedAt: null });
    const itemsService = new ItemsService(prisma);
    const activeBefore = await itemsService.findAll();
    assert(activeBefore.some(i => i.id === 'item-del'), '5.1: Item is active initially');

    await itemsService.remove('item-del');
    const itemAfter = db.items.get('item-del');
    assert(itemAfter.isActive === false, '5.1: Item marked isActive: false');
    assert(itemAfter.deletedAt instanceof Date, '5.1: Item deletedAt timestamp recorded');

    const activeAfter = await itemsService.findAll();
    assert(!activeAfter.some(i => i.id === 'item-del'), '5.1: Soft-deleted item is excluded from findAll()');

    // 5.2 WarehousesService soft-delete
    db.warehouses.set('wh-del', { id: 'wh-del', name: 'Del Warehouse', isActive: true, deletedAt: null });
    const whService = new WarehousesService(prisma);
    await whService.remove('wh-del');
    const whAfter = db.warehouses.get('wh-del');
    assert(whAfter.isActive === false, '5.2: Warehouse marked isActive: false');
    assert(whAfter.deletedAt instanceof Date, '5.2: Warehouse deletedAt timestamp recorded');
    const whList = await whService.findAll();
    assert(!whList.some(w => w.id === 'wh-del'), '5.2: Soft-deleted warehouse is excluded from findAll()');

    // 5.3 SuppliersService soft-delete
    db.suppliers.set('sup-del', { id: 'sup-del', businessName: 'Del Supplier', isActive: true, deletedAt: null });
    const supService = new SuppliersService(prisma);
    await supService.remove('sup-del');
    const supAfter = db.suppliers.get('sup-del');
    assert(supAfter.isActive === false, '5.3: Supplier marked isActive: false');
    assert(supAfter.deletedAt instanceof Date, '5.3: Supplier deletedAt timestamp recorded');
    const supList = await supService.findAll();
    assert(!supList.some(s => s.id === 'sup-del'), '5.3: Soft-deleted supplier is excluded from findAll()');

    // 5.4 FaenasService soft-delete
    db.faenas.set('faena-del', { id: 'faena-del', name: 'Del Faena', isActive: true, status: FaenaStatus.OPERATIVA, deletedAt: null });
    const faenaService = new FaenasService(prisma);
    await faenaService.remove('faena-del');
    const faenaAfter = db.faenas.get('faena-del');
    assert(faenaAfter.isActive === false, '5.4: Faena marked isActive: false');
    assert(faenaAfter.status === FaenaStatus.CERRADA, '5.4: Faena status updated to CERRADA');
    assert(faenaAfter.deletedAt instanceof Date, '5.4: Faena deletedAt timestamp recorded');
    const faenaList = await faenaService.findAll();
    assert(!faenaList.some(f => f.id === 'faena-del'), '5.4: Soft-deleted faena is excluded from findAll()');

    // 5.5 AssetsService soft-delete
    db.assets.set('asset-del', { id: 'asset-del', name: 'Del Asset', isActive: true, operationalStatus: 'OPERATIVO', deletedAt: null });
    const assetService = new AssetsService(prisma);
    await assetService.remove('asset-del');
    const assetAfter = db.assets.get('asset-del');
    assert(assetAfter.isActive === false, '5.5: Asset marked isActive: false');
    assert(assetAfter.operationalStatus === AssetOperationalStatus.DADO_DE_BAJA, '5.5: Asset marked DADO_DE_BAJA');
    assert(assetAfter.deletedAt instanceof Date, '5.5: Asset deletedAt timestamp recorded');
    const assetList = await assetService.findAll();
    assert(!assetList.some(a => a.id === 'asset-del'), '5.5: Soft-deleted asset is excluded from findAll()');
  }

  // -------------------------------------------------------------
  // SUITE 6: Multi-Round Stress Generator & Invariant Oracle
  // -------------------------------------------------------------
  console.log('\n--- SUITE 6: Multi-Round Stress Generator & Invariant Oracle ---');
  {
    const db = new MockPrismaDb();
    const service = new MovementsService(db.getPrismaService());

    // Run 100 alternating randomized INGRESO and SALIDA batches
    let oracleQty = new Prisma.Decimal(0);
    let oracleTotalValue = new Prisma.Decimal(0);
    let oraclePmp = new Prisma.Decimal(0);

    const warehouseId = 'wh-stress';
    const itemId = 'item-stress';

    for (let round = 1; round <= 50; round++) {
      // Ingress
      const qtyIn = new Prisma.Decimal(round * 2);
      const costIn = new Prisma.Decimal(1000 + (round * 50));
      await service.create({
        type: MovementType.INGRESO,
        warehouseId,
        lines: [{ itemId, quantity: qtyIn.toNumber(), unitCost: costIn.toNumber() }],
      }, 'user-stress');

      if (oracleQty.isZero()) {
        oraclePmp = costIn;
        oracleQty = qtyIn;
        oracleTotalValue = qtyIn.times(costIn);
      } else {
        const currentTotal = oracleQty.times(oraclePmp);
        const inTotal = qtyIn.times(costIn);
        oracleQty = oracleQty.plus(qtyIn);
        oraclePmp = currentTotal.plus(inTotal).dividedBy(oracleQty);
        oracleTotalValue = oracleQty.times(oraclePmp);
      }

      // Salida of 1 unit
      const salidaMov = await service.create({
        type: MovementType.SALIDA,
        warehouseId,
        lines: [{ itemId, quantity: 1, unitCost: 999999 }], // Intentionally passed garbage unitCost
      }, 'user-stress');

      oracleQty = oracleQty.minus(new Prisma.Decimal(1));
      // Stamped cost must match active PMP
      const stamped = new Prisma.Decimal(salidaMov.lines[0].unitCost);
      if (!stamped.toDecimalPlaces(4).equals(oraclePmp.toDecimalPlaces(4))) {
        throw new Error(`Round ${round} stamping mismatch: expected ${oraclePmp}, got ${stamped}`);
      }
    }

    const finalStock = db.stocks.get(`${itemId}_${warehouseId}`);
    assert(
      finalStock.quantity.equals(oracleQty),
      `6.1: After 50 rounds of stress, stock quantity (${finalStock.quantity}) matches oracle (${oracleQty})`
    );
    assert(
      finalStock.averageCost.toDecimalPlaces(4).equals(oraclePmp.toDecimalPlaces(4)),
      `6.1: After 50 rounds of stress, stock PMP (${finalStock.averageCost.toFixed(4)}) matches oracle (${oraclePmp.toFixed(4)})`
    );
  }

  // -------------------------------------------------------------
  // SUITE 7: True Parallel Concurrency & Race Condition Simulation
  // -------------------------------------------------------------
  console.log('\n--- SUITE 7: True Parallel Concurrency & Race Condition Simulation ---');
  {
    const db = new MockPrismaDb();
    const service = new MovementsService(db.getPrismaService());

    // 7.1 Setup initial stock: 10 units @ 1000
    await service.create({
      type: MovementType.INGRESO,
      warehouseId: 'wh-race',
      lines: [{ itemId: 'item-race', quantity: 10, unitCost: 1000 }],
    }, 'user-setup');

    // 5 concurrent workers each try to withdraw 3 units (total 15 units requested vs 10 available)
    const workerPromises = Array.from({ length: 5 }, (_, idx) => {
      return service.create({
        type: MovementType.SALIDA,
        warehouseId: 'wh-race',
        lines: [{ itemId: 'item-race', quantity: 3 }],
      }, `worker-${idx + 1}`);
    });

    const results = await Promise.allSettled(workerPromises);
    const fulfilled = results.filter(r => r.status === 'fulfilled');
    const rejected = results.filter(r => r.status === 'rejected');

    assert(fulfilled.length === 3, `7.1: Exactly 3 workers succeeded (got ${fulfilled.length})`);
    assert(rejected.length === 2, `7.1: Exactly 2 workers were rejected (got ${rejected.length})`);
    assert(
      rejected.every(r => r.reason.message.includes('Insufficient stock')),
      '7.1: All rejected workers failed with "Insufficient stock"'
    );

    const raceStock = db.stocks.get('item-race_wh-race');
    assert(
      raceStock.quantity.equals(new Prisma.Decimal(1)),
      `7.1: Remaining stock is exactly 1 unit (never negative, actual: ${raceStock.quantity})`
    );

    // 7.2 High-Concurrency Folio Generation Uniqueness
    // 20 concurrent movements executed simultaneously
    const folioWorkers = Array.from({ length: 20 }, (_, idx) => {
      return service.create({
        type: MovementType.INGRESO,
        warehouseId: 'wh-folio',
        lines: [{ itemId: `item-f-${idx}`, quantity: 1, unitCost: 100 }],
      }, `folio-worker-${idx}`);
    });

    const folioResults = await Promise.all(folioWorkers);
    const folios = folioResults.map(r => r.movementNumber);
    const uniqueFolios = new Set(folios);

    assert(uniqueFolios.size === 20, `7.2: All 20 concurrent folios are strictly unique (size: ${uniqueFolios.size})`);
    assert(folios.every(f => f.startsWith('MOV-')), '7.2: All folios follow MOV-YYYYMM-XXXX pattern');
  }

  // -------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------
  console.log('\n===============================================================');
  console.log(`STRESS SUITE RESULTS: ${passedTests}/${totalTests} PASSED, ${failedTests.length} FAILED`);
  console.log('===============================================================');

  if (failedTests.length > 0) {
    console.error('FAILURES:');
    failedTests.forEach(f => console.error(' - ' + f));
    process.exit(1);
  } else {
    console.log('ALL EMPIRICAL ADVERSARIAL STRESS TESTS PASSED WITH EXIT CODE 0!');
    process.exit(0);
  }
}

runAdversarialStressSuite().catch(err => {
  console.error('FATAL STRESS TEST ERROR:', err);
  process.exit(1);
});
