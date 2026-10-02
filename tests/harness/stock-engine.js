/**
 * Stock, Kardex & PMP Domain Engine (Opaque-Box Contract)
 * Verifies LOGIC-STOCK-LOCK, LOGIC-PMP-DECIMAL, LOGIC-KARDEX-ISOLATE, LOGIC-FOLIO-GEN
 */

const crypto = require('crypto');

class DecimalMock {
  constructor(value) {
    if (value instanceof DecimalMock) {
      this.val = BigInt(value.val);
      this.scale = value.scale;
    } else {
      const str = String(value);
      if (str.includes('.')) {
        const parts = str.split('.');
        const decimals = parts[1].length;
        this.scale = decimals;
        this.val = BigInt(parts[0] + parts[1]);
      } else {
        this.scale = 0;
        this.val = BigInt(str);
      }
    }
  }

  static from(v) {
    return new DecimalMock(v);
  }

  toNumber() {
    return Number(this.val) / Math.pow(10, this.scale);
  }

  toFixed(digits = 4) {
    return this.toNumber().toFixed(digits);
  }

  toString() {
    return String(this.toNumber());
  }

  static add(a, b) {
    const da = DecimalMock.from(a);
    const db = DecimalMock.from(b);
    return new DecimalMock(da.toNumber() + db.toNumber());
  }

  static mul(a, b) {
    const da = DecimalMock.from(a);
    const db = DecimalMock.from(b);
    return new DecimalMock(da.toNumber() * db.toNumber());
  }

  static div(a, b) {
    const da = DecimalMock.from(a);
    const db = DecimalMock.from(b);
    if (db.toNumber() === 0) throw new Error('Division by zero');
    return new DecimalMock(da.toNumber() / db.toNumber());
  }
}

class StockEngine {
  constructor() {
    // Key: `${itemId}_${warehouseId}` => { itemId, warehouseId, quantity: number, averageCost: number, locked: boolean }
    this.stocks = new Map();
    // Kardex entries
    this.kardex = [];
    // Folio sequence tracking: key = "MOV-YYYYMM" => sequence counter
    this.folioCounters = new Map();
  }

  // LOGIC-FOLIO-GEN: Concurrency-safe folio generation
  generateMovementFolio(date = new Date()) {
    const yyyy = date.getUTCFullYear();
    const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
    const prefix = `MOV-${yyyy}${mm}`;

    const currentSeq = (this.folioCounters.get(prefix) || 0) + 1;
    this.folioCounters.set(prefix, currentSeq);

    const formattedSeq = String(currentSeq).padStart(4, '0');
    return `${prefix}-${formattedSeq}`;
  }

  getStockKey(itemId, warehouseId) {
    return `${itemId}_${warehouseId}`;
  }

  // LOGIC-STOCK-LOCK: Acquire row lock simulation (FOR UPDATE)
  acquireRowLock(itemId, warehouseId) {
    const key = this.getStockKey(itemId, warehouseId);
    let stock = this.stocks.get(key);
    if (!stock) {
      stock = { itemId, warehouseId, quantity: 0, averageCost: 0, locked: false };
      this.stocks.set(key, stock);
    }

    if (stock.locked) {
      throw new Error(`LockConflict: Row lock on stock ${key} is currently held by another transaction`);
    }

    stock.locked = true;

    return () => {
      const s = this.stocks.get(key);
      if (s) {
        s.locked = false;
      }
    };
  }

  getStock(itemId, warehouseId) {
    const key = this.getStockKey(itemId, warehouseId);
    const s = this.stocks.get(key);
    if (!s) {
      return { itemId, warehouseId, quantity: 0, averageCost: 0 };
    }
    return { itemId, warehouseId, quantity: s.quantity, averageCost: s.averageCost };
  }

  // Execute movement with transaction and locking
  executeMovement({
    type, // 'INGRESO' | 'SALIDA' | 'AJUSTE'
    warehouseId,
    itemId,
    quantity,
    unitCost = 0,
    faenaId = null,
    assetId = null,
    purchaseOrderId = null,
    userId = 'test-user',
    notes = '',
    date = new Date(),
  }) {
    if (quantity < 0) {
      throw new Error('Bad Request: Quantity must be strictly positive');
    }
    if (quantity === 0 && type !== 'AJUSTE') {
      throw new Error('Bad Request: Quantity must be strictly positive');
    }

    const unlock = this.acquireRowLock(itemId, warehouseId);

    try {
      const key = this.getStockKey(itemId, warehouseId);
      const stock = this.stocks.get(key);

      const currentQty = stock.quantity;
      const currentAvgCost = stock.averageCost;
      let newQty = currentQty;
      let newAvgCost = currentAvgCost;
      let stampedUnitCost = unitCost;

      const folio = this.generateMovementFolio(date);

      if (type === 'INGRESO') {
        newQty = currentQty + quantity;
        // LOGIC-PMP-DECIMAL: Weighted Average Price calculation
        if (newQty > 0) {
          const totalVal = (currentQty * currentAvgCost) + (quantity * unitCost);
          newAvgCost = totalVal / newQty;
        }
        stampedUnitCost = unitCost;
      } else if (type === 'SALIDA') {
        // Enforce stock availability
        if (currentQty < quantity) {
          throw new Error(`Insufficient stock for item ${itemId} in warehouse ${warehouseId}. Available: ${currentQty}, Requested: ${quantity}`);
        }
        newQty = currentQty - quantity;
        // LOGIC-PMP-DECIMAL: SALIDA stamps line unitCost to active PMP! Current averageCost is preserved.
        stampedUnitCost = currentAvgCost;
        newAvgCost = currentAvgCost;
      } else if (type === 'AJUSTE') {
        newQty = quantity;
        newAvgCost = unitCost > 0 ? unitCost : currentAvgCost;
        stampedUnitCost = newAvgCost;
      } else {
        throw new Error(`Invalid movement type: ${type}`);
      }

      stock.quantity = newQty;
      stock.averageCost = newAvgCost;

      // Record Kardex line
      const kardexEntry = {
        id: crypto.randomUUID(),
        movementNumber: folio,
        warehouseId,
        itemId,
        type,
        date: date.toISOString(),
        quantity,
        stampedUnitCost,
        totalCost: quantity * stampedUnitCost,
        balance: newQty,
        averageCost: newAvgCost,
        faenaId,
        assetId,
        purchaseOrderId,
        userId,
        notes,
      };

      this.kardex.push(kardexEntry);

      return {
        folio,
        stock: { quantity: newQty, averageCost: newAvgCost },
        kardexEntry,
      };
    } finally {
      unlock();
    }
  }

  // LOGIC-KARDEX-ISOLATE: Query Kardex isolated by warehouse
  queryKardex({ itemId, warehouseId, startDate = null, endDate = null }) {
    if (!warehouseId) {
      throw new Error('WarehouseId is strictly required for Kardex query isolation');
    }

    return this.kardex
      .filter(entry => {
        if (entry.warehouseId !== warehouseId) return false;
        if (itemId && entry.itemId !== itemId) return false;
        if (startDate && new Date(entry.date) < new Date(startDate)) return false;
        if (endDate && new Date(entry.date) > new Date(endDate)) return false;
        return true;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }
}

module.exports = { StockEngine, DecimalMock };
