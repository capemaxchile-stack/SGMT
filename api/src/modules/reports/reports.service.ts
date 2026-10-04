import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FilterReportsDto } from './dto/filter-reports.dto';
import { MovementType, Prisma } from '@prisma/client';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private getDateRange(filters: FilterReportsDto) {
    const now = new Date();
    let startDate: Date;
    let endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (filters.startDate && filters.endDate) {
      startDate = new Date(filters.startDate);
      endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999);
    } else if (filters.period === 'last_month') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    } else if (filters.period === 'quarter') {
      const currentQuarterMonth = Math.floor(now.getMonth() / 3) * 3;
      startDate = new Date(now.getFullYear(), currentQuarterMonth, 1);
    } else if (filters.period === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1);
    } else {
      // Default: Current Month
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    return { startDate, endDate };
  }

  async getExecutiveSummary(filters: FilterReportsDto) {
    const { startDate, endDate } = this.getDateRange(filters);
    const now = new Date();

    // 1. Fuel logs in period
    const fuelWhere: Prisma.FuelLogWhereInput = {
      dispatchDate: {
        gte: startDate,
        lte: endDate,
      },
    };
    if (filters.faenaId) {
      fuelWhere.faenaId = filters.faenaId;
    }

    const fuelLogs = await this.prisma.fuelLog.findMany({
      where: fuelWhere,
      include: {
        asset: true,
        faena: true,
      },
    });

    const totalFuelLiters = fuelLogs.reduce((acc, l) => acc + Number(l.liters), 0);
    const totalFuelCost = fuelLogs.reduce((acc, l) => acc + Number(l.totalCost), 0);
    const avgFuelPricePerLiter = totalFuelLiters > 0 ? Number((totalFuelCost / totalFuelLiters).toFixed(2)) : 0;

    // 2. Work Orders in period
    const woWhere: Prisma.WorkOrderWhereInput = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    };
    if (filters.faenaId) {
      woWhere.faenaId = filters.faenaId;
    }

    const workOrders = await this.prisma.workOrder.findMany({
      where: woWhere,
      include: {
        asset: true,
        faena: true,
        items: {
          include: {
            item: true,
          },
        },
      },
    });

    const totalMaintenanceCost = workOrders.reduce((acc, w) => acc + Number(w.totalCost || 0), 0);
    let totalSparePartsCost = 0;
    for (const w of workOrders) {
      for (const item of w.items) {
        totalSparePartsCost += Number(item.totalCost || 0);
      }
    }
    const totalLaborCost = Math.max(totalMaintenanceCost - totalSparePartsCost, 0);

    // 3. Direct Warehouse Material Dispatches (SALIDA not linked to fuel)
    const movementsWhere: Prisma.WarehouseMovementWhereInput = {
      type: MovementType.SALIDA,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    };
    if (filters.faenaId) {
      movementsWhere.faenaId = filters.faenaId;
    }

    const warehouseMovements = await this.prisma.warehouseMovement.findMany({
      where: movementsWhere,
      include: {
        lines: {
          include: {
            item: true,
          },
        },
      },
    });

    let directWarehouseMaterialsCost = 0;
    for (const mov of warehouseMovements) {
      for (const line of mov.lines) {
        if (line.item.category !== 'COMBUSTIBLE') {
          directWarehouseMaterialsCost += Number(line.quantity) * Number(line.unitCost || 0);
        }
      }
    }

    // Consolidated Operational Cost
    const totalOperationalCost = totalFuelCost + totalMaintenanceCost + directWarehouseMaterialsCost;

    // 4. Breakdown by Faena
    const faenas = await this.prisma.faena.findMany({
      where: {
        deletedAt: null,
      },
      include: {
        contracts: true,
        assets: {
          where: { endDate: null },
        },
      },
    });

    const faenasSummary = faenas.map((f) => {
      const faenaFuelLogs = fuelLogs.filter((l) => l.faenaId === f.id);
      const faenaWorkOrders = workOrders.filter((w) => w.faenaId === f.id);

      const faenaFuelLiters = faenaFuelLogs.reduce((acc, l) => acc + Number(l.liters), 0);
      const faenaFuelCost = faenaFuelLogs.reduce((acc, l) => acc + Number(l.totalCost), 0);
      const faenaMaintenanceCost = faenaWorkOrders.reduce((acc, w) => acc + Number(w.totalCost || 0), 0);
      const faenaTotalCost = faenaFuelCost + faenaMaintenanceCost;

      const totalContractAmount = f.contracts.reduce((sum: number, c) => sum + Number(c.amount || 0), 0);

      return {
        faenaId: f.id,
        faenaName: f.name,
        location: f.location,
        status: f.status,
        activeAssetsCount: f.assets.length,
        fuelLiters: faenaFuelLiters,
        fuelCost: faenaFuelCost,
        maintenanceCost: faenaMaintenanceCost,
        workOrdersCount: faenaWorkOrders.length,
        totalCost: faenaTotalCost,
        totalContractAmount,
        budgetBurnPercentage: totalContractAmount > 0 ? Number(((faenaTotalCost / totalContractAmount) * 100).toFixed(1)) : 0,
      };
    });

    // 5. Breakdown by Asset / Machinery
    const assets = await this.prisma.asset.findMany({
      where: {
        deletedAt: null,
      },
      include: {
        assignments: {
          where: { endDate: null },
          include: { faena: true },
          take: 1,
        },
      },
    });

    const assetsSummary = assets.map((a) => {
      const assetFuelLogs = fuelLogs.filter((l) => l.assetId === a.id);
      const assetWorkOrders = workOrders.filter((w) => w.assetId === a.id);

      const fuelLiters = assetFuelLogs.reduce((acc, l) => acc + Number(l.liters), 0);
      const fuelCost = assetFuelLogs.reduce((acc, l) => acc + Number(l.totalCost), 0);
      const hoursDelta = assetFuelLogs.reduce((acc, l) => acc + Number(l.hourmeterDelta || 0), 0);
      const kmDelta = assetFuelLogs.reduce((acc, l) => acc + Number(l.kilometrageDelta || 0), 0);
      const maintenanceCost = assetWorkOrders.reduce((acc, w) => acc + Number(w.totalCost || 0), 0);
      const totalCost = fuelCost + maintenanceCost;

      const avgLitersPerHour = hoursDelta > 0 ? Number((fuelLiters / hoursDelta).toFixed(2)) : 0;
      const costPerHour = hoursDelta > 0 ? Number((totalCost / hoursDelta).toFixed(2)) : 0;
      const costPerKm = kmDelta > 0 ? Number((totalCost / kmDelta).toFixed(2)) : 0;

      return {
        assetId: a.id,
        internalNumber: a.internalNumber,
        brand: a.brand,
        model: a.model,
        type: a.type,
        currentHourmeter: Number(a.currentHourmeter),
        currentKilometrage: Number(a.currentKilometrage),
        currentFaena: a.assignments[0]?.faena?.name || 'Central / No asignada',
        hoursWorked: hoursDelta,
        kmTraveled: kmDelta,
        fuelLiters,
        fuelCost,
        avgLitersPerHour,
        maintenanceCost,
        workOrdersCount: assetWorkOrders.length,
        totalCost,
        costPerHour,
        costPerKm,
      };
    }).filter((a) => a.totalCost > 0 || a.fuelLiters > 0 || a.workOrdersCount > 0);

    // 6. Monthly Cost Trend (Last 6 Months)
    const monthlyTrends: Array<{ month: string; label: string; fuelCost: number; maintenanceCost: number; totalCost: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = d.toLocaleString('es-CL', { month: 'short', year: 'numeric' });

      const mFuel = await this.prisma.fuelLog.aggregate({
        where: {
          dispatchDate: { gte: mStart, lte: mEnd },
          ...(filters.faenaId ? { faenaId: filters.faenaId } : {}),
        },
        _sum: { totalCost: true },
      });

      const mWO = await this.prisma.workOrder.aggregate({
        where: {
          createdAt: { gte: mStart, lte: mEnd },
          ...(filters.faenaId ? { faenaId: filters.faenaId } : {}),
        },
        _sum: { totalCost: true },
      });

      const fCost = Number(mFuel._sum.totalCost || 0);
      const mCost = Number(mWO._sum.totalCost || 0);

      monthlyTrends.push({
        month: monthKey,
        label: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
        fuelCost: fCost,
        maintenanceCost: mCost,
        totalCost: fCost + mCost,
      });
    }

    return {
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        label: filters.period || 'current_month',
      },
      kpis: {
        totalOperationalCost,
        totalFuelCost,
        totalFuelLiters,
        avgFuelPricePerLiter,
        totalMaintenanceCost,
        totalLaborCost,
        totalSparePartsCost,
        directWarehouseMaterialsCost,
        totalWorkOrders: workOrders.length,
        completedWorkOrders: workOrders.filter((w) => w.status === 'COMPLETADA').length,
      },
      faenasSummary,
      assetsSummary,
      monthlyTrends,
    };
  }

  async getFaenaClosing(faenaId: string, filters: FilterReportsDto) {
    const faena = await this.prisma.faena.findUnique({
      where: { id: faenaId },
      include: {
        chief: {
          select: { id: true, name: true, email: true },
        },
        contracts: {
          include: {
            costCenters: true,
          },
        },
        assets: {
          include: {
            asset: true,
          },
        },
      },
    });

    if (!faena) {
      throw new NotFoundException(`Faena con ID ${faenaId} no encontrada`);
    }

    const { startDate, endDate } = this.getDateRange(filters);

    // Fuel dispatches for this faena
    const fuelLogs = await this.prisma.fuelLog.findMany({
      where: {
        faenaId,
        dispatchDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        asset: true,
        createdBy: { select: { name: true } },
      },
      orderBy: { dispatchDate: 'desc' },
    });

    const totalFuelLiters = fuelLogs.reduce((acc, l) => acc + Number(l.liters), 0);
    const totalFuelCost = fuelLogs.reduce((acc, l) => acc + Number(l.totalCost), 0);

    // Work Orders for this faena
    const workOrders = await this.prisma.workOrder.findMany({
      where: {
        faenaId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        asset: true,
        items: {
          include: { item: true },
        },
        createdBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalMaintenanceCost = workOrders.reduce((acc, w) => acc + Number(w.totalCost || 0), 0);
    let totalSparePartsCost = 0;
    for (const w of workOrders) {
      for (const item of w.items) {
        totalSparePartsCost += Number(item.totalCost || 0);
      }
    }
    const totalLaborCost = Math.max(totalMaintenanceCost - totalSparePartsCost, 0);

    // Direct Warehouse Movements
    const warehouseMovements = await this.prisma.warehouseMovement.findMany({
      where: {
        faenaId,
        type: MovementType.SALIDA,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        warehouse: true,
        user: { select: { name: true } },
        lines: {
          include: { item: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalWarehouseDispatchesCost = warehouseMovements.reduce((acc, mov) => {
      const movSum = mov.lines.reduce((s, line) => {
        if (line.item.category !== 'COMBUSTIBLE') {
          return s + (Number(line.quantity) * Number(line.unitCost || 0));
        }
        return s;
      }, 0);
      return acc + movSum;
    }, 0);

    const grandTotalCost = totalFuelCost + totalMaintenanceCost + totalWarehouseDispatchesCost;
    const totalContractAmount = faena.contracts.reduce((sum: number, c) => sum + Number(c.amount || 0), 0);

    return {
      faena: {
        id: faena.id,
        name: faena.name,
        location: faena.location,
        status: faena.status,
        chiefName: faena.chief?.name || 'Sin Asignar',
        chiefEmail: faena.chief?.email || '',
        contracts: faena.contracts,
        activeAssets: faena.assets.filter((a) => !a.endDate).map((a) => ({
          id: a.asset.id,
          internalNumber: a.asset.internalNumber,
          brand: a.asset.brand,
          model: a.asset.model,
          type: a.asset.type,
          licensePlate: a.asset.licensePlate,
          currentHourmeter: Number(a.asset.currentHourmeter),
        })),
      },
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        label: filters.period || 'current_month',
      },
      totals: {
        totalFuelLiters,
        totalFuelCost,
        totalMaintenanceCost,
        totalLaborCost,
        totalSparePartsCost,
        totalWarehouseDispatchesCost,
        grandTotalCost,
        totalContractAmount,
        budgetBurnPercentage: totalContractAmount > 0 ? Number(((grandTotalCost / totalContractAmount) * 100).toFixed(1)) : 0,
      },
      fuelLogs,
      workOrders,
      warehouseMovements,
    };
  }
}
