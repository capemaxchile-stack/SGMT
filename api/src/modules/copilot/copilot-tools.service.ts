import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CopilotToolsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tool: get_fleet_status
   * Returns summary of machinery fleet, operational statuses, and current faena assignments.
   */
  async getFleetStatus(params?: { faenaName?: string; type?: string; operationalStatus?: string }) {
    const where: any = {};
    if (params?.operationalStatus) {
      where.operationalStatus = params.operationalStatus;
    }
    if (params?.type) {
      where.type = params.type;
    }

    const assets = await this.prisma.asset.findMany({
      where,
      include: {
        assignments: {
          where: { endDate: null },
          include: { faena: { select: { id: true, name: true, location: true } } },
        },
      },
      orderBy: { internalNumber: 'asc' },
    });

    const filtered = params?.faenaName
      ? assets.filter((a) =>
          a.assignments[0]?.faena.name.toLowerCase().includes(params.faenaName!.toLowerCase()),
        )
      : assets;

    const total = filtered.length;
    const operational = filtered.filter((a) => a.operationalStatus === 'OPERATIVO').length;
    const underMaintenance = filtered.filter((a) => a.operationalStatus === 'EN_MANTENCION').length;
    const detained = filtered.filter((a) => a.operationalStatus === 'DETENIDO').length;

    const byType: Record<string, number> = {};
    const byFaena: Record<string, number> = {};

    filtered.forEach((a) => {
      byType[a.type] = (byType[a.type] || 0) + 1;
      const faenaName = a.assignments[0]?.faena.name || 'Sin Asignación (Patio Central)';
      byFaena[faenaName] = (byFaena[faenaName] || 0) + 1;
    });

    return {
      summary: {
        total,
        operational,
        underMaintenance,
        detained,
        operationalRate: total > 0 ? `${Math.round((operational / total) * 100)}%` : '0%',
        byType,
        byFaena,
      },
      assets: filtered.map((a) => ({
        internalNumber: a.internalNumber,
        type: a.type,
        brand: a.brand,
        model: a.model,
        licensePlate: a.licensePlate,
        status: a.operationalStatus,
        hourmeter: Number(a.currentHourmeter),
        kilometrage: Number(a.currentKilometrage),
        currentFaena: a.assignments[0]?.faena.name || 'Sin Asignación (Patio Central)',
      })),
    };
  }

  /**
   * Tool: get_critical_stock
   * Returns items where total stock across warehouses is at or below minimum threshold.
   */
  async getCriticalStock() {
    const items = await this.prisma.item.findMany({
      where: { isActive: true },
      include: {
        stocks: {
          include: { warehouse: { select: { name: true } } },
        },
      },
      orderBy: { code: 'asc' },
    });

    const criticalItems = items
      .map((item) => {
        const totalStock = item.stocks.reduce((sum, s) => sum + Number(s.quantity), 0);
        const min = item.minimumStock || 0;
        return {
          id: item.id,
          code: item.code,
          description: item.description,
          category: item.category,
          unitOfMeasure: item.unitOfMeasure,
          totalStock,
          minimumStock: min,
          deficit: min > totalStock ? min - totalStock : 0,
          isCritical: totalStock <= min,
          breakdownByWarehouse: item.stocks.map((s) => ({
            warehouse: s.warehouse.name,
            quantity: Number(s.quantity),
          })),
        };
      })
      .filter((i) => i.isCritical);

    return {
      criticalCount: criticalItems.length,
      items: criticalItems,
    };
  }

  /**
   * Tool: get_maintenance_radar
   * Returns machines with maintenance due or upcoming, plus critical work orders.
   */
  async getMaintenanceRadar() {
    const assets = await this.prisma.asset.findMany({
      where: { operationalStatus: { not: 'DADO_DE_BAJA' } },
      include: {
        assignments: {
          where: { endDate: null },
          include: { faena: { select: { name: true } } },
        },
        workOrders: {
          where: { status: { in: ['ABIERTA', 'EN_PROGRESO', 'ESPERA_REPUESTOS'] } },
          select: { id: true, otNumber: true, description: true, priority: true, status: true },
        },
      },
    });

    const intervals = [250, 500, 1000, 2000];
    const alerts: any[] = [];

    for (const asset of assets) {
      const currentH = Number(asset.currentHourmeter);
      for (const interval of intervals) {
        const lastCycle = Math.floor(currentH / interval) * interval;
        const nextTarget = lastCycle + interval;
        const diff = nextTarget - currentH;

        if (diff <= 50) {
          alerts.push({
            assetNumber: asset.internalNumber,
            assetType: asset.type,
            brandModel: `${asset.brand} ${asset.model}`,
            faena: asset.assignments[0]?.faena?.name || 'Patio Central',
            currentHourmeter: currentH,
            serviceInterval: `${interval}h`,
            nextServiceAt: nextTarget,
            hoursRemaining: diff,
            isOverdue: diff <= 0,
            severity: diff <= 0 ? 'CRITICA' : diff <= 20 ? 'ALTA' : 'MEDIA',
            openWorkOrders: asset.workOrders,
          });
        }
      }
    }

    return {
      totalAlerts: alerts.length,
      overdueCount: alerts.filter((a) => a.isOverdue).length,
      alerts: alerts.sort((a, b) => a.hoursRemaining - b.hoursRemaining),
    };
  }

  /**
   * Tool: get_pending_approvals
   * Returns purchase orders awaiting manager approval.
   */
  async getPendingApprovals() {
    const pendingOrders = await this.prisma.purchaseOrder.findMany({
      where: { status: 'PENDIENTE_APROBACION' },
      include: {
        supplier: { select: { businessName: true, rut: true } },
        lines: {
          include: { item: { select: { code: true, description: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      count: pendingOrders.length,
      orders: pendingOrders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        supplier: o.supplier.businessName,
        totalAmount: Number(o.totalAmount),
        createdAt: o.createdAt,
        estimatedDeliveryDate: o.estimatedDeliveryDate,
        itemsCount: o.lines.length,
        lines: o.lines.map((l) => ({
          itemCode: l.item.code,
          description: l.item.description,
          quantity: Number(l.quantity),
          unitPrice: Number(l.unitPrice),
          totalPrice: Number(l.totalPrice),
        })),
      })),
    };
  }

  /**
   * Tool: get_faenas_financial_summary
   * Returns aggregated operational costs, fuel spend, and contracts per faena.
   */
  async getFaenasFinancialSummary(faenaName?: string) {
    const where: any = {};
    if (faenaName) {
      where.name = { contains: faenaName, mode: 'insensitive' };
    }

    const faenas = await this.prisma.faena.findMany({
      where,
      include: {
        contracts: true,
        assets: { where: { endDate: null }, include: { asset: true } },
      },
    });

    const results = await Promise.all(
      faenas.map(async (f) => {
        // Fuel Logs in this faena
        const fuelLogs = await this.prisma.fuelLog.findMany({
          where: { faenaId: f.id },
        });
        const totalLiters = fuelLogs.reduce((sum, l) => sum + Number(l.liters), 0);
        const totalFuelCost = fuelLogs.reduce((sum, l) => sum + Number(l.totalCost), 0);

        // Maintenance Work Orders in this faena
        const workOrders = await this.prisma.workOrder.findMany({
          where: { faenaId: f.id, status: 'COMPLETADA' },
        });
        const totalMaintCost = workOrders.reduce((sum, wo) => sum + Number(wo.totalCost), 0);

        // Contract budget
        const totalBudget = f.contracts.reduce((sum, c) => sum + Number(c.amount), 0);
        const totalSpent = totalFuelCost + totalMaintCost;

        return {
          faenaId: f.id,
          name: f.name,
          location: f.location,
          status: f.status,
          activeAssetsCount: f.assets.length,
          contractsCount: f.contracts.length,
          totalBudget,
          totalSpent,
          burnPercentage: totalBudget > 0 ? `${((totalSpent / totalBudget) * 100).toFixed(1)}%` : '0%',
          fuel: {
            totalLiters,
            totalCost: totalFuelCost,
            logCount: fuelLogs.length,
          },
          maintenance: {
            completedOrders: workOrders.length,
            totalCost: totalMaintCost,
          },
        };
      }),
    );

    return {
      faenasCount: results.length,
      faenas: results,
    };
  }

  /**
   * Tool: get_fuel_abnormalities
   * Checks fuel logs with high or abnormal L/hr consumption.
   */
  async getFuelAbnormalities() {
    const logs = await this.prisma.fuelLog.findMany({
      include: {
        asset: { select: { internalNumber: true, type: true, brand: true, model: true } },
        faena: { select: { name: true } },
      },
      orderBy: { dispatchDate: 'desc' },
      take: 20,
    });

    const highConsumptionLogs = logs.filter((l) => Number(l.litersPerHour) > 40);

    return {
      abnormalCount: highConsumptionLogs.length,
      logs: highConsumptionLogs.map((l) => ({
        id: l.id,
        dispatchDate: l.dispatchDate,
        asset: `${l.asset.internalNumber} (${l.asset.brand} ${l.asset.model})`,
        faena: l.faena?.name || 'Patio Central',
        liters: Number(l.liters),
        hoursWorked: Number(l.hourmeterDelta),
        litersPerHour: Number(l.litersPerHour),
        notes: l.notes,
      })),
    };
  }
}
