import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FaenaStatus, AssetOperationalStatus, OrderStatus } from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getMetrics() {
    const activeFaenasCount = await this.prisma.faena.count({
      where: {
        status: {
          in: [FaenaStatus.ACTIVA, FaenaStatus.EN_FORMACION],
        },
      },
    });

    const totalAssetsCount = await this.prisma.asset.count();
    
    const operationalAssetsCount = await this.prisma.asset.count({
      where: {
        operationalStatus: AssetOperationalStatus.OPERATIVO,
      },
    });

    const operationalPercentage = totalAssetsCount > 0 
      ? (operationalAssetsCount / totalAssetsCount) * 100 
      : 0;

    const totalStockItemsCount = await this.prisma.item.count();

    const itemsWithStocks = await this.prisma.item.findMany({
      include: {
        stocks: {
          select: {
            quantity: true
          }
        }
      }
    });

    let lowStockItemsCount = 0;
    for (const item of itemsWithStocks) {
      const totalStock = item.stocks.reduce((acc, stock) => acc + Number(stock.quantity), 0);
      if (totalStock < item.minimumStock) {
        lowStockItemsCount++;
      }
    }

    const pendingOrdersCount = await this.prisma.purchaseOrder.count({
      where: {
        status: OrderStatus.PENDIENTE_APROBACION,
      },
    });

    const openWorkOrdersCount = await this.prisma.workOrder.count({
      where: {
        status: {
          in: ['ABIERTA', 'EN_PROGRESO', 'ESPERA_REPUESTOS'],
        },
      },
    });

    const criticalWorkOrdersCount = await this.prisma.workOrder.count({
      where: {
        priority: 'CRITICA',
        status: {
          not: 'COMPLETADA',
        },
      },
    });

    const fuelLogs = await this.prisma.fuelLog.findMany({
      select: {
        liters: true,
        totalCost: true,
      },
    });

    const totalFuelLiters = fuelLogs.reduce((acc, log) => acc + Number(log.liters), 0);
    const totalFuelSpend = fuelLogs.reduce((acc, log) => acc + Number(log.totalCost), 0);

    const recentMovements = await this.prisma.warehouseMovement.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        lines: true,
        user: {
          select: { id: true, name: true, email: true },
        },
        warehouse: true,
      },
    });

    const recentOrders = await this.prisma.purchaseOrder.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        supplier: true,
      },
    });

    const recentWorkOrders = await this.prisma.workOrder.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        asset: true,
        faena: true,
      },
    });

    const recentFuelLogs = await this.prisma.fuelLog.findMany({
      take: 5,
      orderBy: { dispatchDate: 'desc' },
      include: {
        asset: true,
        faena: true,
      },
    });

    return {
      activeFaenasCount,
      totalAssetsCount,
      operationalAssetsCount,
      operationalPercentage,
      totalStockItemsCount,
      lowStockItemsCount,
      pendingOrdersCount,
      openWorkOrdersCount,
      criticalWorkOrdersCount,
      totalFuelLiters,
      totalFuelSpend,
      recentMovements,
      recentOrders,
      recentWorkOrders,
      recentFuelLogs,
    };
  }
}
