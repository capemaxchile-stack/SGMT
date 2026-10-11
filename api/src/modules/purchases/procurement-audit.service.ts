import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AssetOperationalStatus, MovementType, OrderStatus } from '@prisma/client';

export interface AuditAnomaly {
  id: string;
  ruleCode: 'SPLIT_PURCHASE' | 'PRICE_SPIKE' | 'INACTIVE_ASSET' | 'OVERSTOCK_PURCHASE' | 'SOLE_SOURCE_UNJUSTIFIED';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  title: string;
  description: string;
  detectedAt: Date;
  evidence: {
    orders?: string[];
    requests?: string[];
    supplier?: string;
    items?: string[];
    asset?: string;
    amounts?: Record<string, any>;
  };
  recommendedAction: string;
}

@Injectable()
export class ProcurementAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async getFraudRadar(faenaId?: string): Promise<{
    anomalies: AuditAnomaly[];
    summary: {
      totalAnomalies: number;
      criticalCount: number;
      highCount: number;
      mediumCount: number;
    };
  }> {
    const anomalies: AuditAnomaly[] = [];

    // 1. RULE 1: Split POs / Fraccionamiento de Compras (orders in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const orders = await this.prisma.purchaseOrder.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo },
        status: { notIn: [OrderStatus.CANCELADA, OrderStatus.RECHAZADA] },
        ...(faenaId ? { OR: [{ faenaId }, { purchaseRequest: { faenaId } }] } : {}),
      },
      include: {
        supplier: true,
        lines: { include: { item: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group orders by supplier
    const ordersBySupplier = new Map<string, typeof orders>();
    for (const order of orders) {
      const list = ordersBySupplier.get(order.supplierId) || [];
      list.push(order);
      ordersBySupplier.set(order.supplierId, list);
    }

    const SPLIT_WINDOW_HOURS = 72;
    const APPROVAL_THRESHOLD = 1000000; // 1M CLP standard supervisor limit

    ordersBySupplier.forEach((suppOrders, supplierId) => {
      if (suppOrders.length < 2) return;

      for (let i = 0; i < suppOrders.length; i++) {
        const orderA = suppOrders[i];
        const closeOrders = [orderA];
        let cumulativeAmount = Number(orderA.totalAmount);

        for (let j = i + 1; j < suppOrders.length; j++) {
          const orderB = suppOrders[j];
          const diffHours = Math.abs(orderA.createdAt.getTime() - orderB.createdAt.getTime()) / (1000 * 60 * 60);

          if (diffHours <= SPLIT_WINDOW_HOURS) {
            closeOrders.push(orderB);
            cumulativeAmount += Number(orderB.totalAmount);
          }
        }

        // Check if individual orders are under threshold but sum exceeds it
        if (
          closeOrders.length >= 2 &&
          closeOrders.every((o) => Number(o.totalAmount) <= APPROVAL_THRESHOLD) &&
          cumulativeAmount > APPROVAL_THRESHOLD
        ) {
          const orderNumbers = closeOrders.map((o) => o.orderNumber);
          const anomalyKey = `SPLIT_${supplierId}_${orderNumbers.sort().join('_')}`;

          // Avoid duplicate report
          if (!anomalies.some((a) => a.id === anomalyKey)) {
            anomalies.push({
              id: anomalyKey,
              ruleCode: 'SPLIT_PURCHASE',
              severity: 'CRITICAL',
              title: 'Posible Fraccionamiento de Compras (Pitufeo)',
              description: `Se detectaron ${closeOrders.length} órdenes de compra emitidas al proveedor "${orderA.supplier.businessName}" dentro de una ventana de ${SPLIT_WINDOW_HOURS}h. Cada una está bajo el umbral de supervisión ($${APPROVAL_THRESHOLD.toLocaleString('es-CL')}), pero su suma total es de $${cumulativeAmount.toLocaleString('es-CL')}.`,
              detectedAt: orderA.createdAt,
              evidence: {
                orders: orderNumbers,
                supplier: orderA.supplier.businessName,
                amounts: {
                  individualAmounts: closeOrders.map((o) => Number(o.totalAmount)),
                  totalSum: cumulativeAmount,
                  thresholdEvaded: APPROVAL_THRESHOLD,
                },
              },
              recommendedAction: 'Revisar si las compras corresponden a un mismo requerimiento para consolidar y exigir autorización de Gerencia de Operaciones.',
            });
          }
        }
      }
    });

    // 2. RULE 2: Price Spikes (> 20% higher than historical last purchase or catalog)
    // Map item previous prices
    const itemHistoricalPrices = new Map<string, number>();
    const sortedOrdersChronological = [...orders].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    for (const order of sortedOrdersChronological) {
      for (const line of order.lines) {
        const unitPrice = Number(line.unitPrice);
        const prevPrice = itemHistoricalPrices.get(line.itemId);

        if (prevPrice && prevPrice > 0) {
          const increasePercentage = ((unitPrice - prevPrice) / prevPrice) * 100;
          if (increasePercentage > 20) {
            anomalies.push({
              id: `PRICE_SPIKE_${order.id}_${line.id}`,
              ruleCode: 'PRICE_SPIKE',
              severity: increasePercentage > 50 ? 'CRITICAL' : 'HIGH',
              title: `Sobreprecio Anómalo en Repuesto (${increasePercentage.toFixed(1)}%)`,
              description: `El repuesto "${line.item.code} - ${line.item.description}" fue comprado a $${unitPrice.toLocaleString('es-CL')} en la orden ${order.orderNumber}. El precio anterior de referencia era $${prevPrice.toLocaleString('es-CL')} (alza de +${increasePercentage.toFixed(1)}%).`,
              detectedAt: order.createdAt,
              evidence: {
                orders: [order.orderNumber],
                supplier: order.supplier.businessName,
                items: [line.item.code],
                amounts: {
                  currentPrice: unitPrice,
                  previousPrice: prevPrice,
                  percentageIncrease: Number(increasePercentage.toFixed(1)),
                },
              },
              recommendedAction: 'Auditar la justificación técnica de la compra y contrastar cotizaciones con otros proveedores registrados.',
            });
          }
        }

        itemHistoricalPrices.set(line.itemId, unitPrice);
      }
    }

    // 3. RULE 3: Direct Dispatches/Purchases to Inactive or Decommissioned Assets
    const ordersWithTargetAssets = await this.prisma.purchaseOrder.findMany({
      where: {
        targetAssetId: { not: null },
        createdAt: { gte: thirtyDaysAgo },
        status: { notIn: [OrderStatus.CANCELADA, OrderStatus.RECHAZADA] },
      },
      include: {
        targetAsset: true,
        supplier: true,
      },
    });

    for (const po of ordersWithTargetAssets) {
      if (
        po.targetAsset &&
        (po.targetAsset.operationalStatus === AssetOperationalStatus.DADO_DE_BAJA ||
          po.targetAsset.operationalStatus === AssetOperationalStatus.DETENIDO)
      ) {
        anomalies.push({
          id: `ASSET_INACTIVE_${po.id}`,
          ruleCode: 'INACTIVE_ASSET',
          severity: 'CRITICAL',
          title: 'Compra Asignada a Equipo Dado de Baja / Detenido',
          description: `La orden de compra ${po.orderNumber} ($${Number(po.totalAmount).toLocaleString('es-CL')}) tiene como destino el equipo ${po.targetAsset.internalNumber} (${po.targetAsset.brand} ${po.targetAsset.model}), el cual se encuentra con estado "${po.targetAsset.operationalStatus}".`,
          detectedAt: po.createdAt,
          evidence: {
            orders: [po.orderNumber],
            asset: `${po.targetAsset.internalNumber} (${po.targetAsset.operationalStatus})`,
            supplier: po.supplier.businessName,
            amounts: { totalAmount: Number(po.totalAmount) },
          },
          recommendedAction: 'Congelar recepción y verificar inmediatamente si el repuesto está siendo desviado a otra faena o equipo no autorizado.',
        });
      }
    }

    // 4. RULE 4: Overstocking (Purchasing items with > 3x minStock and 0 dispatches in 60d)
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const recentLines = await this.prisma.purchaseOrderLine.findMany({
      where: {
        purchaseOrder: {
          createdAt: { gte: thirtyDaysAgo },
          status: { notIn: [OrderStatus.CANCELADA, OrderStatus.RECHAZADA] },
        },
      },
      include: {
        purchaseOrder: true,
        item: {
          include: {
            stocks: true,
          },
        },
      },
    });

    for (const line of recentLines) {
      const item = line.item;
      const totalStock = item.stocks.reduce((acc, s) => acc + Number(s.quantity), 0);
      const minStock = Number(item.minimumStock);

      if (minStock > 0 && totalStock >= minStock * 3) {
        // Check if there was any dispatch in last 60 days
        const dispatchCount = await this.prisma.warehouseMovementLine.count({
          where: {
            itemId: item.id,
            movement: {
              type: MovementType.SALIDA,
              createdAt: { gte: sixtyDaysAgo },
            },
          },
        });

        if (dispatchCount === 0) {
          const anomalyKey = `OVERSTOCK_${line.purchaseOrderId}_${item.id}`;
          if (!anomalies.some((a) => a.id === anomalyKey)) {
            anomalies.push({
              id: anomalyKey,
              ruleCode: 'OVERSTOCK_PURCHASE',
              severity: 'MEDIUM',
              title: 'Compra Innecesaria por Sobrestock y Nula Rotación',
              description: `Se ordenó compra de ${Number(line.quantity)} unidades de "${item.code} - ${item.description}" en ${line.purchaseOrder.orderNumber}, a pesar de existir ${totalStock} unidades en bodega (mínimo ${minStock}) y registrar 0 salidas en los últimos 60 días.`,
              detectedAt: line.purchaseOrder.createdAt,
              evidence: {
                orders: [line.purchaseOrder.orderNumber],
                items: [item.code],
                amounts: {
                  currentStock: totalStock,
                  minimumStock: minStock,
                  orderedQuantity: Number(line.quantity),
                },
              },
              recommendedAction: 'Cancelar o reasignar la orden para evitar acumulación de inventario ocioso y descapitalización.',
            });
          }
        }
      }
    }

    // Summary counts
    const criticalCount = anomalies.filter((a) => a.severity === 'CRITICAL').length;
    const highCount = anomalies.filter((a) => a.severity === 'HIGH').length;
    const mediumCount = anomalies.filter((a) => a.severity === 'MEDIUM').length;

    return {
      anomalies,
      summary: {
        totalAnomalies: anomalies.length,
        criticalCount,
        highCount,
        mediumCount,
      },
    };
  }
}
